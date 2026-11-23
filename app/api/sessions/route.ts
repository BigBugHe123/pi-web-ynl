import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { startServerPerf } from "@/lib/perf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const perf = startServerPerf("GET /api/sessions");
  const searchParams = new URL(req.url).searchParams;
  const rustBackend = backendUrl();
  const url = new URL(`${rustBackend.replace(/\/$/, "")}/api/v1/sessions`);
  for (const key of ["force", "summary"]) {
    const value = searchParams.get(key);
    if (value !== null) url.searchParams.set(key, value);
  }
  try {
    const [catalogResponse, rustRunning] = await Promise.all([
      fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) }),
      fetch(`${rustBackend.replace(/\/$/, "")}/api/v1/sessions/running`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_000),
      }).then((response) => response.ok
        ? response.json() as Promise<{ sessionListVersion?: number; runningSessionIds?: string[]; awaitingInputSessionIds?: string[] }>
        : null).catch(() => null),
    ]);
    if (!catalogResponse.ok) {
      return NextResponse.json({ error: `Rust session catalogue failed (${catalogResponse.status})` }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const catalog = await catalogResponse.json() as { sessions?: unknown[]; sessionListVersion?: number };
    const body = {
      sessions: catalog.sessions ?? [],
      sessionListVersion: catalog.sessionListVersion ?? 0,
      runningSessionIds: rustRunning?.runningSessionIds ?? [],
      awaitingInputSessionIds: rustRunning?.awaitingInputSessionIds ?? [],
      completionNotificationSuppressedSessionIds: [] as string[],
    };
    return perf?.attach(NextResponse.json(body, { headers: { "Cache-Control": "no-store" } }))
      ?? NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
