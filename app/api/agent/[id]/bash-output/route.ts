import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const backend = backendUrl();

// The Rust backend owns the temp-file validation, session-reference check and
// bounded inline/download handling. Keep this route as a streaming adapter.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const incoming = new URL(req.url);
    const target = new URL(`/api/v1/agent/${encodeURIComponent(id)}/bash-output${incoming.search}`, backend);
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 204 });
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
