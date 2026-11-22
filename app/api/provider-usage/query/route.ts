import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { isProviderUsageId } from "@/lib/provider-usage-ids";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

export async function POST(request: Request) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  let body: { providerId?: unknown };
  try {
    body = await request.json() as { providerId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const providerId = typeof body.providerId === "string" ? body.providerId : "";
  if (!isProviderUsageId(providerId)) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });

  try {
    const response = await fetch(new URL("/api/v1/provider-usage/query", backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ providerId, status: "query-failed", message: "The provider usage query failed." });
  }
}
