import { NextRequest, NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { PI_WEB_SESSION_COOKIE, PI_WEB_SESSION_MAX_AGE, requestRustAuth } from "@/lib/web-auth";

export const dynamic = "force-dynamic";

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:"
    || request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() === "https";
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: "Authentication backend unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function jsonResponse(response: Response): Promise<NextResponse> {
  const body = await response.json().catch(() => ({ error: "Invalid authentication backend response" }));
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["retry-after"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return NextResponse.json(body, { status: response.status, headers });
}

export async function GET(request: NextRequest) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  try {
    const response = await requestRustAuth(request, { forwardAuthorization: true });
    return await jsonResponse(response);
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(request)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = body && typeof body.password === "string" ? body.password : "";
  try {
    const response = await requestRustAuth(request, { method: "POST", body: JSON.stringify({ password }) });
    const result = await response.json().catch(() => null) as { ok?: unknown; token?: unknown; error?: unknown; retryAfterMs?: unknown } | null;
    if (!response.ok) {
      const headers = new Headers({ "Cache-Control": "no-store" });
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) headers.set("Retry-After", retryAfter);
      return NextResponse.json(result ?? { error: "Invalid authentication backend response" }, { status: response.status, headers });
    }
    if (!result || result.ok !== true || typeof result.token !== "string") return unavailable();

    const output = NextResponse.json({ ok: true });
    output.cookies.set({
      name: PI_WEB_SESSION_COOKIE,
      value: result.token,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: PI_WEB_SESSION_MAX_AGE,
    });
    return output;
  } catch {
    return unavailable();
  }
}

export async function DELETE(request: NextRequest) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PI_WEB_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
