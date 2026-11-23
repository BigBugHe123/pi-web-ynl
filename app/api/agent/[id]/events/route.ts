import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const backend = backendUrl();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const incoming = new URL(req.url);
    const target = new URL(`/api/v1/sessions/${encodeURIComponent(id)}/events${incoming.search}`, backend);
    const response = await fetch(target, { cache: "no-store", signal: req.signal, headers: { Accept: "text/event-stream" } });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 204 });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
