import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { invalidateModelsCache } from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = backendUrl();

async function forward(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(`/api/v1/models/enabled${incoming.search}`, backend);
  try {
    const response = await fetch(target, {
      method: request.method,
      headers: request.method === "GET" ? undefined : { "Content-Type": request.headers.get("Content-Type") ?? "application/json" },
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: request.signal,
    });
    if (request.method === "PUT" && response.ok) await invalidateModelsCache();
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return forward(request);
}

export async function PUT(request: Request) {
  return forward(request);
}
