import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";

// POST /api/push/subscribe - register a browser subscription in the Rust backend.
export async function POST(req: Request): Promise<Response> {
  try {
    const headers = new Headers({ "Content-Type": req.headers.get("Content-Type") ?? "application/json" });
    const response = await fetch(new URL("/api/v1/push/subscribe", backend), {
      method: "POST",
      headers,
      body: await req.arrayBuffer(),
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
