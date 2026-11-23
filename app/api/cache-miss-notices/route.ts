import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = backendUrl();

async function proxy(req?: Request, body?: unknown) {
  try {
    const response = await fetch(new URL("/api/v1/settings/cache-miss-notices", backend), {
      ...(req ? { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: req.signal } : {}),
      cache: "no-store",
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET() { return proxy(); }

export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || typeof (body as { enabled?: unknown }).enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  return proxy(req, body);
}
