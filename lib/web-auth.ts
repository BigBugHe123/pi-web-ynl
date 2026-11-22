export const PI_WEB_AUTH_USERNAME = "pi";
export const PI_WEB_SESSION_COOKIE = "pi_web_session";
export const PI_WEB_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function rustBackendUrl(): string {
  return process.env.PI_RUST_BACKEND_URL
    ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
    ?? "http://127.0.0.1:3030";
}

export async function requestRustAuth(
  request: Request,
  options: { method?: "GET" | "POST"; body?: string; forwardAuthorization?: boolean; gate?: boolean } = {},
): Promise<Response> {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  if (options.forwardAuthorization) {
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);
  }
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return fetch(new URL(options.gate ? "/api/v1/web-auth/gate" : "/api/v1/web-auth", rustBackendUrl()), {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    cache: "no-store",
  });
}
