import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
const backend = backendUrl();

export async function GET(request: Request) {
  const target = new URL("/api/v1/app-update", backend);
  target.searchParams.set("currentVersion", CURRENT_VERSION);
  if (process.env.PI_WEB_SKIP_VERSION_CHECK === "1") target.searchParams.set("skip", "1");
  try {
    const response = await fetch(target, { cache: "no-store", signal: request.signal });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
