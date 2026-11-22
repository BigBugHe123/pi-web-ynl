import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { MAX_SESSION_DELETE_IDS, type SessionDeleteResult } from "@/lib/session-delete-types";
import { SESSION_ID_PATTERN } from "@/lib/session-ui-state-shared";

export const dynamic = "force-dynamic";

// A project group's "Delete all sessions": Rust removes each requested
// session and its subagent family, while keeping families that started running.

const NO_STORE = { "Cache-Control": "no-store" };

function refusal(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

// POST /api/sessions/delete - body { ids: string[] } (at most MAX_SESSION_DELETE_IDS).
export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) return refusal(403, "Untrusted API request");
  if (!hasJsonContentType(req)) return refusal(415, "Content-Type must be application/json");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return refusal(400, "Invalid JSON body");
  }
  const ids = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as { ids?: unknown }).ids : undefined;
  if (!Array.isArray(ids) || ids.length === 0) return refusal(400, "ids must be a non-empty array");
  if (ids.length > MAX_SESSION_DELETE_IDS) return refusal(400, `ids may hold at most ${MAX_SESSION_DELETE_IDS} session ids`);
  if (!ids.every((id) => typeof id === "string" && SESSION_ID_PATTERN.test(id))) return refusal(400, "ids must be session ids");

  try {
    const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";
    const response = await fetch(new URL("/api/v1/sessions/delete", backend), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const result = await response.json() as SessionDeleteResult & { success?: boolean; data?: SessionDeleteResult; error?: string };
    if (!response.ok || result.error || !result.data) {
      return refusal(response.status || 502, result.error ?? `Rust backend returned HTTP ${response.status}`);
    }
    const data = result.data;
    return NextResponse.json(data satisfies SessionDeleteResult, { headers: NO_STORE });
  } catch (error) {
    return refusal(500, error instanceof Error ? error.message : String(error));
  }
}
