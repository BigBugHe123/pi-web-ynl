import { NextResponse } from "next/server";
import { invalidateModelsCache } from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

export async function POST(request: Request) {
  let body: { provider?: unknown } = {};
  try {
    body = await request.json() as { provider?: unknown };
  } catch {
    // An empty body means "refresh all providers".
  }
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  try {
    const response = await fetch(new URL("/api/v1/models/refresh", backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(provider ? { provider } : {}),
      cache: "no-store",
      signal: request.signal,
    });
    const result = await response.clone().json().catch(() => null) as { changed?: unknown } | null;
    if (response.ok && result?.changed === true) await invalidateModelsCache();
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ completed: false, changed: false, reason: "runtime" });
  }
}
