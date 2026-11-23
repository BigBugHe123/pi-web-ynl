import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import type { McpErrorResponse, McpRefusalReason, McpSignInFlowInfo } from "@/lib/api-types";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = backendUrl();

function refusal(status: number, reason: McpRefusalReason, error: string) {
  return NextResponse.json({ error, reason } satisfies McpErrorResponse, { status });
}

// POST /api/mcp/sign-in body: { scope, name, cwd? }
// Rust resolves and validates the configured server and owns the OAuth flow.
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
    const response = await fetch(new URL("/api/v1/mcp/sign-in", backend), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: req.signal,
      body: JSON.stringify(body),
    });
    const result = await response.json() as McpSignInFlowInfo | McpErrorResponse;
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}
