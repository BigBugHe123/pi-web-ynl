import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const rustBackend = backendUrl();

function proxyResponse(response: Response): Response {
  return new Response(response.body, { status: response.status, headers: response.headers });
}

// Rust reads the project MCP configuration and trust store, validates the
// allowed root, and returns both the trust status and the project server list.
export async function GET(req: Request) {
  const cwd = new URL(req.url).searchParams.get("cwd");
  const target = new URL("/api/v1/project-trust", rustBackend);
  if (cwd !== null) target.searchParams.set("cwd", cwd);
  try {
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return proxyResponse(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error), reason: "trust-unreadable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) {
    return NextResponse.json({ error: "Untrusted API request", reason: "request-denied" }, { status: 403 });
  }
  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json", reason: "content-type" }, { status: 415 });
  }
  try {
    const response = await fetch(new URL("/api/v1/project-trust", rustBackend), {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
      body: await req.arrayBuffer(),
      cache: "no-store",
      signal: req.signal,
    });
    return proxyResponse(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error), reason: "internal" }, { status: 502 });
  }
}
