import { NextResponse } from "next/server";
import type { SkillInstallScope, SkillInfo } from "@/lib/api-types";

export const dynamic = "force-dynamic";
const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { cwd?: unknown; package?: unknown; scope?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd : "";
    if (!cwd) return NextResponse.json({ error: "cwd required" }, { status: 400 });
    const pkg = typeof body.package === "string" ? body.package : undefined;
    const scope = body.scope === "global" || body.scope === "project" ? body.scope as SkillInstallScope : undefined;
    if ((pkg && !scope) || (!pkg && scope)) return NextResponse.json({ error: "package and scope must be provided together" }, { status: 400 });
    const listUrl = new URL("/api/v1/skills", backend);
    listUrl.searchParams.set("cwd", cwd);
    const listResponse = await fetch(listUrl, { cache: "no-store", signal: req.signal });
    if (!listResponse.ok) return NextResponse.json({ error: `Rust backend returned HTTP ${listResponse.status}` }, { status: 502 });
    const data = await listResponse.json() as { skills?: SkillInfo[] };
    const installs = (data.skills ?? []).flatMap((skill) => skill.install ? [skill.install] : []).filter((install) => !pkg || (install.package === pkg && install.scope === scope));
    if (pkg && installs.length === 0) return NextResponse.json({ error: "Installed skill not found" }, { status: 404 });
    const response = await fetch(new URL("/api/v1/skills/check", backend), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cwd, installs }), cache: "no-store", signal: req.signal,
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
