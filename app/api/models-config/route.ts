import { NextResponse } from "next/server";
import { ContextWindowError, normalizeContextWindowOverrides } from "@/lib/model-context";
import { checkProviderEntries, ProviderEntryError } from "@/lib/model-provider-check";
import { checkImageMaxBytes, ImageMaxBytesError } from "@/lib/model-image-limits";
import { invalidateModelsCache } from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

export async function GET() {
  try {
    const response = await fetch(new URL("/api/v1/models-config", backend), { cache: "no-store" });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const config = normalizeContextWindowOverrides(body);
    checkProviderEntries(config);
    checkImageMaxBytes(config);
    const response = await fetch(new URL("/api/v1/models-config", backend), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
      cache: "no-store",
      signal: req.signal,
    });
    if (response.ok) await invalidateModelsCache();
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" } });
  } catch (error) {
    if (error instanceof ContextWindowError || error instanceof ProviderEntryError || error instanceof ImageMaxBytesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
