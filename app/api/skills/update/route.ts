import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import type { SkillInfo, SkillInstallScope } from "@/lib/api-types";

export const dynamic = "force-dynamic";
const backend = backendUrl();

export async function POST(req: Request) {
  try {
    const body = await req.json() as { cwd?: unknown; package?: unknown; scope?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd : "";
    if (!cwd) return NextResponse.json({ error: "cwd, package, and scope are required" }, { status: 400 });
    const pkg = typeof body.package === "string" ? body.package : "";
    const scope = body.scope === "global" || body.scope === "project" ? body.scope as SkillInstallScope : undefined;
    if (!pkg || !scope) return NextResponse.json({ error: "package and scope are required" }, { status: 400 });
    const listUrl = new URL("/api/v1/skills", backend);
    listUrl.searchParams.set("cwd", cwd);
    const listResponse = await fetch(listUrl, { cache: "no-store", signal: req.signal });
    if (!listResponse.ok) return NextResponse.json({ error: `Rust backend returned HTTP ${listResponse.status}` }, { status: 502 });
    const data = await listResponse.json() as { skills?: SkillInfo[] };
    const skill = data.skills?.find((item) => item.install?.package === pkg && item.install.scope === scope);
    if (!skill?.install) return NextResponse.json({ error: "Installed skill not found" }, { status: 404 });
    if (!skill.install.canCheckForUpdates) return NextResponse.json({ error: "This skill cannot be updated automatically" }, { status: 400 });
    const response = await fetch(new URL("/api/v1/skills/update", backend), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cwd, install: skill.install }), cache: "no-store", signal: req.signal,
    });
    const result = await response.json() as { success?: boolean; error?: string; output?: string };
    if (!response.ok) return NextResponse.json(result, { status: response.status });
    const refreshed = await fetch(listUrl, { cache: "no-store", signal: req.signal });
    const refreshedData = refreshed.ok ? await refreshed.json() as { skills?: SkillInfo[] } : undefined;
    const updatedSkill = refreshedData?.skills?.find((item) => item.install?.package === pkg && item.install.scope === scope);
    return NextResponse.json({ ...result, skill: updatedSkill });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
