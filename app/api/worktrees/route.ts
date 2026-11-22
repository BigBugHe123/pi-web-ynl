import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backendUrl = () => process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

async function forward(request: Request, method: "GET" | "POST" | "DELETE") {
  const target = new URL("/api/v1/worktrees", backendUrl());
  if (method === "GET") target.search = new URL(request.url).search;
  try {
    const response = await fetch(target, {
      method,
      ...(method === "GET" ? {} : {
        headers: { "content-type": request.headers.get("content-type") ?? "" },
        body: await request.arrayBuffer(),
      }),
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
export const DELETE = (request: Request) => forward(request, "DELETE");
