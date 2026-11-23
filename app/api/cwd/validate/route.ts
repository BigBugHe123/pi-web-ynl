import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const backend = backendUrl();
  try {
    const response = await fetch(new URL("/api/v1/cwd/validate", backend), {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: await request.arrayBuffer(),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
