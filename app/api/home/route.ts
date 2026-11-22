import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const backend = process.env.PI_RUST_BACKEND_URL
    ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
    ?? "http://127.0.0.1:3030";
  try {
    const response = await fetch(new URL("/api/v1/home", backend), { cache: "no-store", signal: request.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
