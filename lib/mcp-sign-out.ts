import type { McpServerConfig } from "./mcp-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** OAuth URL for an HTTP MCP server with no provider auth or Authorization header. */
export function mcpOAuthUrl(config: McpServerConfig | Record<string, unknown>): string | undefined {
  if (!isRecord(config) || !("url" in config) || typeof config.url !== "string" || config.auth) return undefined;
  const headers = isRecord(config.headers) ? Object.keys(config.headers) : [];
  return headers.some((header) => header.toLowerCase() === "authorization") ? undefined : config.url;
}

/** Sign out through pi-web-backend, which owns the OAuth credential file and active sign-in flow. */
export async function signOutMcpServer(name: string, url: string): Promise<boolean> {
  const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";
  const response = await fetch(new URL("/api/v1/mcp/sign-out", backend), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
  const result = await response.json() as { removed?: boolean; error?: string };
  if (!response.ok) throw new Error(result.error ?? `Rust backend returned HTTP ${response.status}`);
  return result.removed === true;
}

/** Credential keys used by pi-mcp, including the URL-only legacy key. */
export function mcpOAuthStoreKeys(name: string, url: string): { key: string; legacyKey: string } {
  const legacyKey = String(new URL(url));
  return { key: `mcp__${name.replace(/-/g, "_")}|${legacyKey}`, legacyKey };
}
