import { backendUrl as rustBackendUrl } from "@/lib/server/backend-url";
import { NextRequest, NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function backendUrl(path: string): URL {
  const backend = rustBackendUrl();
  return new URL(path, backend);
}

export async function GET(request: NextRequest) {
  const target = backendUrl("/api/v1/cwd/browse");
  target.search = request.nextUrl.search;
  try {
    const response = await fetch(target, { cache: "no-store", signal: request.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isApiRequestAllowed(request)) {
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  try {
    const response = await fetch(backendUrl("/api/v1/cwd/browse"), {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
      body: await request.arrayBuffer(),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
