import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const headers = { "Cache-Control": "no-store" };
  if (query.length > 200) {
    return NextResponse.json({ error: "Search query exceeds 200 characters" }, { status: 400, headers });
  }
  try {
    const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";
    const target = new URL("/api/v1/sessions/search", backend);
    target.searchParams.set("q", query);
    const response = await fetch(target, { cache: "no-store", signal: request.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502, headers });
  }
}
