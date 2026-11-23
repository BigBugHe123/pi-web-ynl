import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { EXTENSION_REPORTED_CODE } from "@/lib/agent-client";
import { cwdMissingBody, missingCwdFromBody } from "@/lib/missing-cwd";

const backend = backendUrl();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let type: string | undefined;
  try {
    const command = await req.json() as Record<string, unknown>;
    type = typeof command.type === "string" ? command.type : undefined;
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}/commands`, backend), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command), cache: "no-store", signal: req.signal,
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || body.error) {
      const missingCwd = missingCwdFromBody(body);
      return NextResponse.json({ ...body, ...(missingCwd ? cwdMissingBody(missingCwd) : {}), ...(type === "prompt" ? { code: "prompt_rejected", accepted: false } : {}), ...(body.code === EXTENSION_REPORTED_CODE ? { code: EXTENSION_REPORTED_CODE } : {}) }, { status: response.status });
    }
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error), ...(type === "prompt" ? { code: "prompt_rejected", accepted: false } : {}) }, { status: 502 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const url = new URL(`/api/v1/sessions/${encodeURIComponent(id)}${new URL(req.url).search}`, backend);
    const response = await fetch(url, { cache: "no-store", signal: req.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
