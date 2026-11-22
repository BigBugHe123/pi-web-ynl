import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

async function proxy(method: "GET" | "POST", body?: string, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(new URL("/api/v1/sessions/ui-state", backend), {
      method,
      ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error), reason: "internal" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const response = await proxy("GET", undefined, req.signal);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) return NextResponse.json({ error: "Untrusted API request", reason: "request-denied" }, { status: 403 });
  if (!hasJsonContentType(req)) return NextResponse.json({ error: "Content-Type must be application/json", reason: "content-type" }, { status: 415 });
  let body: string;
  try { body = JSON.stringify(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON body", reason: "invalid-request" }, { status: 400 }); }
  const response = await proxy("POST", body, req.signal);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}
