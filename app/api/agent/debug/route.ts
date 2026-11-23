import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const MAX_SESSION_ID_LENGTH = 512;
const backend = backendUrl();

// GET /api/agent/debug?session=<id> - Rust owns the process snapshot and open-stream registry.
export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("session");
  const sessionId = requested && requested.length <= MAX_SESSION_ID_LENGTH ? requested : null;
  try {
    const rustUrl = new URL("/api/v1/debug", backend);
    if (sessionId) rustUrl.searchParams.set("session", sessionId);
    const response = await fetch(rustUrl, { cache: "no-store", signal: AbortSignal.timeout(1_000) });
    if (!response.ok) return NextResponse.json({ error: `Rust debug snapshot failed (${response.status})` }, { status: 502 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
