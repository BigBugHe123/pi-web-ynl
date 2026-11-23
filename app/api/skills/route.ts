import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/skills?cwd=<path>
// The Rust resource loader validates workspace access and reads skill resources.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cwd = searchParams.get("cwd");
  if (!cwd) return NextResponse.json({ error: "cwd required" }, { status: 400 });
  try {
    const backend = backendUrl();
    const target = new URL("/api/v1/skills", backend);
    target.searchParams.set("cwd", cwd);
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

// PATCH /api/skills — toggle disable-model-invocation on SKILL.md files.
// Body: { filePath, disableModelInvocation } for one skill, or
// { filePaths, disableModelInvocation } for the panel's "Enable all" /
// "Disable all". A batch edits each file on its own and reports every one, so
// a skill the route refuses does not stop the rest.
export async function PATCH(req: Request) {
  try {
    const body = await req.json() as {
      filePath?: string;
      filePaths?: unknown;
      disableModelInvocation: boolean;
    };
    if (typeof body.disableModelInvocation !== "boolean") {
      return NextResponse.json({ error: "disableModelInvocation must be a boolean" }, { status: 400 });
    }
    if (body.filePaths !== undefined
      && (!Array.isArray(body.filePaths) || !body.filePaths.every((item) => typeof item === "string" && item))) {
      return NextResponse.json({ error: "filePaths must be a list of paths" }, { status: 400 });
    }
    if (body.filePaths === undefined && (typeof body.filePath !== "string" || !body.filePath)) {
      return NextResponse.json({ error: "filePath required" }, { status: 400 });
    }
    const backend = backendUrl();
    const response = await fetch(new URL("/api/v1/skills", backend), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
