import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

const backend = backendUrl();
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const target = new URL(`/api/v1/sessions/${encodeURIComponent(id)}/detail`, backend);
    target.search = new URL(req.url).search;
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { name } = await req.json() as { name?: string };
    if (typeof name !== "string") return NextResponse.json({ error: "name is required" }, { status: 400 });
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}/rename`, backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const result = await response.json() as { data?: { ok?: boolean }; error?: string };
    if (!response.ok || result.error || result.data?.ok !== true) return NextResponse.json({ error: result.error ?? `Rust backend returned HTTP ${response.status}` }, { status: response.status });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}`, backend), { method: "DELETE" });
    const result = await response.json() as { data?: { deleted?: string[] }; error?: string };
    if (!response.ok || result.error || !result.data) return NextResponse.json({ error: result.error ?? `Rust backend returned HTTP ${response.status}` }, { status: response.status });
    const deleted = result.data.deleted ?? [];
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }); }
}
