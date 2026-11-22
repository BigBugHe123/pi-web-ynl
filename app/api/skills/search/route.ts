import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { query?: unknown; limit?: unknown };
    if (typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }
    const response = await fetch(new URL("/api/v1/skills/search", backend), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: body.query, limit: body.limit }),
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
