import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import type { SessionInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

// The sidebar's Fork: copies the session's current branch into a new session
// file named after the source plus a short random suffix (Rust session backend).
// File-level work, like rename and delete: it never starts, prompts or shuts
// down an AgentSession, so a running source keeps its run and an idle one
// stays closed.

const NO_STORE = { "Cache-Control": "no-store" };

interface SessionForkResponse {
  sessionId: string;
  /** The new session's catalogue row, as GET /api/sessions will list it. */
  session: SessionInfo;
}

function refusal(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: NO_STORE });
}

// POST /api/sessions/[id]/fork - body {}, or { side: true, name? } for a side
// chat (`/side`, ADR 0007); answers with the new session.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isApiRequestAllowed(req)) return refusal(403, "request-denied", "Untrusted API request");
  if (!hasJsonContentType(req)) return refusal(415, "request-denied", "Content-Type must be application/json");
  const { id } = await params;

  try {
    const body = await req.json().catch(() => null) as { side?: unknown; name?: unknown } | null;
    const side = body?.side === true;
    const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}/fork`, backend), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side, ...(typeof body?.name === "string" ? { name: body.name } : {}) }),
    });
    const result = await response.json() as { success?: boolean; data?: SessionForkResponse; code?: string; error?: string };
    if (!response.ok || result.error || !result.data?.session) {
      const code = result.code ?? (response.status === 404 ? "not_found" : response.status === 409 ? "unsaved" : "failed");
      return refusal(response.status || 502, code, result.error ?? `Rust backend returned HTTP ${response.status}`);
    }
    return NextResponse.json(result.data, { headers: NO_STORE });
  } catch (error) {
    return refusal(500, "failed", error instanceof Error ? error.message : String(error));
  }
}
