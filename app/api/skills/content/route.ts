import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cwd = searchParams.get("cwd");
  const filePath = searchParams.get("filePath");
  if (!cwd) return NextResponse.json({ error: "cwd required" }, { status: 400 });
  if (!filePath) return NextResponse.json({ error: "filePath required" }, { status: 400 });
  try {
    const backend = process.env.PI_RUST_BACKEND_URL ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL ?? "http://127.0.0.1:3030";
    const target = new URL("/api/v1/skills/content", backend);
    for (const key of ["cwd", "filePath", "document"]) {
      const value = searchParams.get(key);
      if (value !== null) target.searchParams.set(key, value);
    }
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
