import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend = backendUrl();

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
