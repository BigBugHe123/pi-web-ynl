import { NextResponse } from "next/server";
import type { McpErrorResponse, McpRefusalReason, McpSignInFlowInfo } from "@/lib/api-types";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";
const UNKNOWN = "No sign-in has that id: it ended over a minute ago, or Pi Web restarted";
type Context = { params: Promise<{ flowId: string }> };

function backendUrl(flowId: string, suffix = ""): URL {
  return new URL(`/api/v1/mcp/sign-in/${encodeURIComponent(flowId)}${suffix}`, backend);
}

function refusal(status: number, reason: McpRefusalReason, error: string) {
  return NextResponse.json({ error, reason } satisfies McpErrorResponse, { status });
}

export async function GET(req: Request, { params }: Context) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  const { flowId } = await params;
  try {
    const response = await fetch(backendUrl(flowId), { cache: "no-store", signal: req.signal });
    if (!response.ok) return refusal(response.status === 404 ? 404 : response.status, "sign-in-unknown", UNKNOWN);
    return NextResponse.json(await response.json() as McpSignInFlowInfo);
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}

export async function POST(req: Request, { params }: Context) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  if (!hasJsonContentType(req)) return refusal(415, "content-type", "Content-Type must be application/json");
  const { flowId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return refusal(400, "invalid-request", "Invalid JSON body");
  }
  const redirectUrl = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).redirectUrl
    : undefined;
  try {
    const response = await fetch(backendUrl(flowId, "/redirect"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: req.signal,
      body: JSON.stringify({ redirectUrl }),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}

export async function DELETE(req: Request, { params }: Context) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  const { flowId } = await params;
  try {
    const response = await fetch(backendUrl(flowId), { method: "DELETE", signal: req.signal });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}
