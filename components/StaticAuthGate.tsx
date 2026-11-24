"use client";

import { useEffect } from "react";

/**
 * Static exports do not include Next's request-time proxy. In that deployment
 * only, ask the same-origin Rust auth endpoint whether the app should show the
 * login page. Normal Next deployments keep using proxy.ts as before.
 */
export function StaticAuthGate() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1") return;
    const isLoginPage = window.location.pathname === "/login" || window.location.pathname === "/login/";

    const controller = new AbortController();
    void fetch("/api/web-auth", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const result: unknown = await response.json();
      if (!result || typeof result !== "object") return;
      const auth = result as { enabled?: unknown; authenticated?: unknown };
      if (isLoginPage && (auth.enabled !== true || auth.authenticated === true)) {
        window.location.replace("/");
      } else if (!isLoginPage && auth.enabled === true && auth.authenticated === false) {
        const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    }).catch(() => {
      // The backend remains responsible for protecting API requests. A failed
      // status check should leave the shell visible so it can show connection
      // errors instead of sending the user into a login loop.
    });

    return () => controller.abort();
  }, []);

  return null;
}
