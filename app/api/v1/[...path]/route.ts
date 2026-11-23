import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rustBackend = backendUrl();

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const incoming = new URL(req.url);
  const target = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}${incoming.search}`, rustBackend);
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
      // Node's fetch must use duplex for a streamed request body.
      ...(req.method === "GET" || req.method === "HEAD" ? {} : { duplex: "half" as const }),
      cache: "no-store",
      signal: req.signal,
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("connection");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("Cache-Control", "no-cache, no-transform");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 204 });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `YLL backend request failed: ${message}` }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
