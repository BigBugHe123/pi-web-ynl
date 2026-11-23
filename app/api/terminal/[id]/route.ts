import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const backend = backendUrl();

type Context = { params: Promise<{ id: string }> };

async function forward(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(new URL(path, backend), { cache: "no-store", ...init });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  try {
    return await forward(`/api/v1/terminals/${encodeURIComponent(id)}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: Context) {
  const { id } = await params;
  try {
    return await forward(`/api/v1/terminals/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("Content-Type") ?? "application/json" },
      body: await req.text(),
      signal: req.signal,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id } = await params;
  try {
    return await forward(`/api/v1/terminals/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
