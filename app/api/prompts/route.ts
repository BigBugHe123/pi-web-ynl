import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxy(request: Request): Promise<Response> {
  if (request.method !== "GET" && !isApiRequestAllowed(request)) {
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }
  const incoming = new URL(request.url);
  try {
    const upstream = await fetch(new URL(`/api/v1/prompts${incoming.search}`, backendUrl()), {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" ? undefined : request.body,
      ...(request.method === "GET" ? {} : { duplex: "half" as const }),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 204 });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export const GET = proxy;
export const PUT = proxy;
export const DELETE = proxy;
