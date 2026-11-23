import { backendUrl } from "@/lib/server/backend-url";
const backend = backendUrl();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const target = new URL(`/api/v1/sessions/${encodeURIComponent(id)}/context`, backend);
    target.search = new URL(req.url).search;
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
