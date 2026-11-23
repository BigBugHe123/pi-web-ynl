import { backendUrl } from "@/lib/server/backend-url";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = backendUrl();

async function forward(method: "GET" | "PUT", req?: Request): Promise<Response> {
  try {
    const response = await fetch(new URL("/api/v1/subagents/settings", backend), {
      method,
      ...(req ? { headers: { "content-type": "application/json" }, body: await req.text(), signal: req.signal } : {}),
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET() {
  return forward("GET");
}

export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) return Response.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return forward("PUT", req);
}
