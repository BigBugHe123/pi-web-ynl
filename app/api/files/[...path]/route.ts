import { NextResponse } from "next/server";
import { isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rustBackend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, { params }: RouteContext): Promise<Response> {
  if (request.method !== "GET" && !isApiRequestAllowed(request)) {
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }
  const { path } = await params;
  const incoming = new URL(request.url);
  const target = new URL(`/api/v1/files/${path.map(encodeURIComponent).join("/")}${incoming.search}`, rustBackend);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      ...(request.method === "GET" || request.method === "HEAD" ? {} : { duplex: "half" as const }),
      cache: "no-store",
      signal: request.signal,
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("connection");
    responseHeaders.delete("transfer-encoding");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 204 });
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `YLL backend request failed: ${message}` }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
