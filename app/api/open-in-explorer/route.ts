import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function rustBackendIsLocal(): boolean {
  const configured = process.env.PI_RUST_BACKEND_SAME_HOST?.trim().toLowerCase();
  if (["1", "true", "yes"].includes(configured ?? "")) return true;
  if (["0", "false", "no"].includes(configured ?? "")) return false;
  try {
    const hostname = new URL(backendUrl()).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return hostname === "localhost"
      || hostname.endsWith(".localhost")
      || hostname === "host.docker.internal"
      || hostname === "::1"
      || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

function remoteResponse(method: "GET" | "POST") {
  if (method === "GET") {
    const platform = process.platform === "win32" || process.platform === "darwin" || process.platform === "linux"
      ? process.platform
      : "unknown";
    return NextResponse.json({ supported: false, reason: "remote", platform });
  }
  return NextResponse.json({ error: "remote" }, { status: 403 });
}

async function forward(request: Request, method: "GET" | "POST") {
  if (!rustBackendIsLocal()) return remoteResponse(method);
  try {
    const response = await fetch(new URL("/api/v1/open-in-explorer", backendUrl()), {
      method,
      headers: {
        "x-pi-web-host": request.headers.get("host") ?? "",
        ...(method === "POST" ? { "content-type": request.headers.get("content-type") ?? "" } : {}),
      },
      ...(method === "POST" ? { body: await request.arrayBuffer() } : {}),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export const GET = (request: Request) => forward(request, "GET");
export const POST = (request: Request) => forward(request, "POST");
