import type { ProjectTrustStatus } from "./api-types";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

/** Read a project trust decision from the Rust owner of trust.json. */
export async function readProjectTrustStatusFromRust(cwd: string): Promise<ProjectTrustStatus> {
  const target = new URL("/api/v1/project-trust", backend);
  target.searchParams.set("cwd", cwd);
  const response = await fetch(target, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as ProjectTrustStatus & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Rust backend returned HTTP ${response.status}`);
  return body;
}

export type FreshProjectFolderCheck =
  | { allowed: true }
  | { allowed: false; reason: "trust-too-broad"; breadth: NonNullable<import("./api-types").McpErrorResponse["breadth"]> }
  | { allowed: false; reason: "folder-not-fresh" };

export async function checkFreshProjectFolderFromRust(cwd: string, allowedRoots: Iterable<string>): Promise<FreshProjectFolderCheck> {
  const response = await fetch(new URL("/api/v1/project-trust/fresh-check", backend), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cwd, allowedRoots: [...allowedRoots] }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as FreshProjectFolderCheck & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Rust backend returned HTTP ${response.status}`);
  return body;
}
