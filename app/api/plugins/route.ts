import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import type { PluginsBulkResponse, PluginsResponse } from "@/lib/api-types";

export const dynamic = "force-dynamic";

const backend = backendUrl();

async function readPlugins(cwd: string, signal?: AbortSignal): Promise<PluginsResponse> {
  const target = new URL("/api/v1/plugins", backend);
  target.searchParams.set("cwd", cwd);
  const response = await fetch(target, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Rust backend returned HTTP ${response.status}`);
  return await response.json() as PluginsResponse;
}

export async function GET(req: Request) {
  const cwd = new URL(req.url).searchParams.get("cwd");
  if (!cwd) return Response.json({ error: "cwd required" }, { status: 400 });
  try {
    return Response.json(await readPlugins(cwd, req.signal));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!isApiRequestAllowed(req)) return Response.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const cwd = typeof body.cwd === "string" ? body.cwd : "";
  const workspace = cwd;
  const action = typeof body.action === "string" ? body.action : "";
  if (!["install", "remove", "update", "enable", "disable"].includes(action)) {
    return Response.json({ error: action ? `Unsupported action: ${action}` : "action required" }, { status: 400 });
  }
  try {
    const endpoint = ["enable", "disable"].includes(action) ? "/api/v1/plugins/toggle" : "/api/v1/plugins/action";
    const response = await fetch(new URL(endpoint, backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, cwd: workspace }),
      cache: "no-store",
      signal: req.signal,
    });
    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
      });
    }
    const result = await response.json() as { results?: PluginsBulkResponse["results"] };
    const inventory = await readPlugins(workspace, req.signal);
    return Response.json(body.packages !== undefined
      ? { ...inventory, results: result.results ?? [] } satisfies PluginsBulkResponse
      : inventory);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
