import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { invalidateModelsCache } from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = backendUrl();

type Params = { params: Promise<{ provider: string }> };

function invalidateOnLoginSuccess(body: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> | null {
  if (!body) return null;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pending = "";
  const inspect = async (frame: string) => {
    const data = frame.split(/\r?\n/u).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    try {
      if ((JSON.parse(data) as { type?: unknown }).type === "success") await invalidateModelsCache();
    } catch { /* forward malformed SSE data unchanged */ }
  };
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true });
      const frames = pending.split(/\r?\n\r?\n/u);
      pending = frames.pop() ?? "";
      for (const frame of frames) {
        await inspect(frame);
        controller.enqueue(encoder.encode(`${frame}\n\n`));
      }
    },
    async flush(controller) {
      pending += decoder.decode();
      if (pending) {
        await inspect(pending);
        controller.enqueue(encoder.encode(pending));
      }
    },
  }));
}

export async function GET(request: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/auth/login/${encodeURIComponent(provider)}`, backend), {
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(invalidateOnLoginSuccess(response.body), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/auth/login/${encodeURIComponent(provider)}`, backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
