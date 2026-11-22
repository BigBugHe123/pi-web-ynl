import { NextResponse } from "next/server";
import type { McpErrorResponse, McpRefusalReason, McpTestResponse } from "@/lib/api-types";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

function refusal(status: number, reason: McpRefusalReason, error: string) {
  return NextResponse.json({ error, reason } satisfies McpErrorResponse, { status });
}

// POST /api/mcp/test body: { scope, name, cwd? }
// Rust reads and validates the selected mcp.json entry before connecting.
export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  if (!hasJsonContentType(req)) return refusal(415, "content-type", "Content-Type must be application/json");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return refusal(400, "invalid-request", "Invalid JSON body");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return refusal(400, "invalid-request", "Expected a JSON object");
  }

  try {
    const response = await fetch(new URL("/api/v1/mcp/test", backend), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: req.signal,
      body: JSON.stringify(body),
    });
    const result = await response.json() as McpTestResponse | McpErrorResponse;
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}
