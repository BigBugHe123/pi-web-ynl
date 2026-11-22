import { NextResponse } from "next/server";

const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}/lease`, backend), { method: "POST", cache: "no-store", signal: req.signal });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
