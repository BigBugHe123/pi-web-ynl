import { NextResponse } from "next/server";
import type { McpErrorResponse, McpRefusalReason } from "@/lib/api-types";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { SETTINGS_BUILTIN_TOOLS } from "@/lib/tool-presets";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";
const CHANGES = ["enabled", "builtinTools", "codemode", "codemodeMode", "codemodeInlineBudget"] as const;

function refusal(status: number, reason: McpRefusalReason, error: string) {
  return NextResponse.json({ error, reason } satisfies McpErrorResponse, { status });
}

async function proxy(req?: Request, body?: unknown) {
  try {
    const response = await fetch(new URL("/api/v1/settings/tools", backend), {
      ...(req ? { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: req.signal } : {}),
      cache: "no-store",
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return refusal(502, "internal", error instanceof Error ? error.message : String(error));
  }
}

export async function GET() {
  return proxy();
}

export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  if (!hasJsonContentType(req)) return refusal(415, "content-type", "Content-Type must be application/json");
  let body: unknown;
  try { body = await req.json(); } catch { return refusal(400, "invalid-request", "Invalid JSON body"); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return refusal(400, "invalid-request", "Expected a JSON object");
  const changes = body as Record<string, unknown>;
  if (CHANGES.filter((key) => key in changes).length !== 1) {
    return refusal(400, "invalid-request", "Send one of enabled (PowerShell), builtinTools, codemode, codemodeMode or codemodeInlineBudget");
  }
  if ("builtinTools" in changes && (!Array.isArray(changes.builtinTools) || !changes.builtinTools.every((name) => SETTINGS_BUILTIN_TOOLS.includes(name as never)))) {
    return refusal(400, "invalid-request", `builtinTools must list names from ${SETTINGS_BUILTIN_TOOLS.join(", ")}`);
  }
  if ("codemode" in changes && changes.codemode !== "automatic" && changes.codemode !== "always") return refusal(400, "invalid-request", "codemode must be \"automatic\" or \"always\"");
  if ("codemodeMode" in changes && changes.codemodeMode !== "on" && changes.codemodeMode !== "only") return refusal(400, "invalid-request", "codemodeMode must be \"on\" or \"only\"");
  if ("codemodeInlineBudget" in changes) {
    const budget = changes.codemodeInlineBudget;
    if (budget !== null && (typeof budget !== "number" || !Number.isSafeInteger(budget) || budget < 0 || budget > 1_000_000)) {
      return refusal(400, "invalid-request", "codemodeInlineBudget must be a whole number from 0 to 1000000, or null");
    }
  }
  if ("enabled" in changes && typeof changes.enabled !== "boolean") return refusal(400, "invalid-request", "enabled must be a boolean");
  return proxy(req, body);
}
