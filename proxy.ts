import { NextResponse, type NextRequest } from "next/server";
import {
  isApiRequestAllowed,
  isApiRequestHostAllowed,
} from "@/lib/request-security";
import { requestRustAuth } from "@/lib/web-auth";

export async function proxy(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname === "/api"
    || request.nextUrl.pathname.startsWith("/api/");
  const isTrustedRequest = isApiRequest
    ? isApiRequestAllowed(request)
    : isApiRequestHostAllowed(request);

  if (!isTrustedRequest) {
    if (!isApiRequest) {
      return new NextResponse("Untrusted request", { status: 403 });
    }
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }

  let auth: { enabled: boolean; authenticated: boolean };
  try {
    const response = await requestRustAuth(request, { forwardAuthorization: isApiRequest, gate: true });
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after") ?? "1";
      return new NextResponse("Too many failed attempts", {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": retryAfter },
      });
    }
    if (!response.ok) throw new Error(`Rust auth returned HTTP ${response.status}`);
    const result: unknown = await response.json();
    if (!result || typeof result !== "object"
      || typeof (result as { enabled?: unknown }).enabled !== "boolean"
      || typeof (result as { authenticated?: unknown }).authenticated !== "boolean") {
      throw new Error("Rust auth returned an invalid decision");
    }
    auth = result as { enabled: boolean; authenticated: boolean };
    if (process.env.PI_WEB_PASSWORD && !auth.enabled) {
      throw new Error("Rust backend does not have password authentication enabled");
    }
  } catch {
    // Never fall back to local password validation or open access when Rust is
    // unavailable. A failed decision must not bypass the configured gate.
    return new NextResponse("Authentication backend unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!auth.enabled && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const authenticated = !auth.enabled || auth.authenticated;
  if (request.nextUrl.pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }
  if (request.nextUrl.pathname === "/api/web-auth") return NextResponse.next();

  if (!authenticated) {
    if (!isApiRequest) {
      const loginUrl = new URL("/login", request.url);
      if (request.nextUrl.search) {
        loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      }
      return NextResponse.redirect(loginUrl);
    }
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="Pi Web", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/api/:path*"] };
