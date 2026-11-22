export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const target = new URL(`/api/v1/terminals/${encodeURIComponent(id)}/events`, backend);
  const requestUrl = new URL(req.url);
  const after = requestUrl.searchParams.get("after");
  const holder = requestUrl.searchParams.get("holder");
  if (after !== null) target.searchParams.set("after", after);
  if (holder !== null) target.searchParams.set("holder", holder);
  const headers = new Headers();
  for (const name of ["last-event-id", "x-forwarded-for", "user-agent"]) {
    const value = req.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  let response: Response;
  try {
    response = await fetch(target, { headers, cache: "no-store", signal: req.signal });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
  if (!response.ok || !response.body) {
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  }

  const reader = response.body.getReader();
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    req.signal.removeEventListener("abort", onAbort);
  };
  const onAbort = () => {
    cleanup();
    void reader.cancel();
  };
  req.signal.addEventListener("abort", onAbort, { once: true });
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          cleanup();
          controller.close();
        } else {
          controller.enqueue(chunk.value);
        }
      } catch (error) {
        cleanup();
        controller.error(error);
      }
    },
    cancel(reason) {
      cleanup();
      return reader.cancel(reason);
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
