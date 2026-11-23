import { backendUrl } from "@/lib/server/backend-url";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const backend = backendUrl();

async function forward(req: Request, method: "GET" | "PUT" | "PATCH" | "DELETE"): Promise<Response> {
  try {
    const incoming = new URL(req.url);
    const target = new URL("/api/v1/subagents/profiles", backend);
    target.search = incoming.search;
    const response = await fetch(target, {
      method,
      ...(method === "GET" ? {} : { headers: { "content-type": "application/json" }, body: await req.text() }),
      cache: "no-store",
      signal: req.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function GET(req: Request) {
  return forward(req, "GET");
}

export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) return Response.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return forward(req, "PUT");
}

export async function PATCH(req: Request) {
  if (!isApiRequestAllowed(req)) return Response.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return forward(req, "PATCH");
}

export async function DELETE(req: Request) {
  if (!isApiRequestAllowed(req)) return Response.json({ error: "Untrusted API request" }, { status: 403 });
  if (!hasJsonContentType(req)) return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return forward(req, "DELETE");
}
