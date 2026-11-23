import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { localDateStamp } from "@/lib/default-cwd";

const backend = backendUrl();

export async function POST(req: Request) {
  try {
    const response = await fetch(new URL("/api/v1/default-cwd", backend), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: localDateStamp() }),
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
