import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

const backend = backendUrl();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await fetch(new URL(`/api/v1/sessions/${encodeURIComponent(id)}/auto-name`, backend), {
      method: "POST", cache: "no-store", signal: req.signal,
    });
    if (!response.ok) return new Response(response.body, { status: response.status, headers: response.headers });
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
