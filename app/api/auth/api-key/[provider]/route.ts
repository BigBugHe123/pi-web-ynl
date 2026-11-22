import { NextResponse } from "next/server";
import { invalidateModelsCache } from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

type Params = { params: Promise<{ provider: string }> };

export async function POST(request: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/auth/api-key/${encodeURIComponent(provider)}`, backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
      signal: request.signal,
    });
    if (response.ok) await invalidateModelsCache();
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/auth/credentials/${encodeURIComponent(provider)}/api-key`, backend), {
      method: "POST",
      cache: "no-store",
      signal: request.signal,
    });
    if (response.ok) await invalidateModelsCache();
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
