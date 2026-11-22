import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";

// GET /api/push/config - VAPID public key for client-side push subscriptions.
export async function GET(): Promise<Response> {
  try {
    const response = await fetch(new URL("/api/v1/push/config", backend), { cache: "no-store" });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
