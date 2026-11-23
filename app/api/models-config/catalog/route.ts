import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend = backendUrl();

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const target = new URL("/api/v1/models-config/catalog", backend);
    target.search = requestUrl.search;
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
