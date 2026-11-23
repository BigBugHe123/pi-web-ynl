import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const rustBackend = backendUrl();

function backendError(status: number, error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error), reason: "internal" }, { status });
}

async function proxyJson(url: URL, init?: RequestInit) {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const body = await response.json().catch(() => ({ error: `Rust backend returned HTTP ${response.status}` }));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return backendError(502, error);
  }
}

// Rust owns project validation, MCP config reads, settings snapshots, status,
// redaction, and the overview's server validation.
export async function GET(req: Request) {
  const target = new URL("/api/v1/mcp/overview", rustBackend);
  const cwd = new URL(req.url).searchParams.get("cwd");
  if (cwd !== null) target.searchParams.set("cwd", cwd);
  return proxyJson(target);
}

// This route checks only request origin/content type. Rust validates the
// action and project path, reads the files, applies trust rules, and writes.
export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) {
    return NextResponse.json({ error: "Untrusted API request", reason: "request-denied" }, { status: 403 });
  }
  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json", reason: "content-type" }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", reason: "invalid-request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a JSON object", reason: "invalid-request" }, { status: 400 });
  }
  return proxyJson(new URL("/api/v1/mcp/actions", rustBackend), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: req.signal,
  });
}
