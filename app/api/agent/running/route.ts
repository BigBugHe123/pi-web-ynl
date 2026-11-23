import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/agent/running - Lightweight snapshot for visible-tab polling.
// sessionUiStateRevision (null when unreadable) tells the sidebar its pins and
// archive changed elsewhere; it costs one stat while the file is unchanged.
// The Rust runtime reports active and awaiting-input session state.
// serverNow: this server's clock, which stamps reads (`readAt`); a browser
// dates its unread markers on it (lib/unread-markers.ts), never on its own.
export async function GET() {
  const rustBackend = backendUrl();
  const rustRunning = await fetch(`${rustBackend.replace(/\/$/, "")}/api/v1/sessions/running`, {
    cache: "no-store",
    signal: AbortSignal.timeout(1_000),
  })
    .then((response) => response.ok ? response.json() as Promise<{ sessionListVersion?: number; runningSessionIds?: string[]; awaitingInputSessionIds?: string[]; sessionUiStateRevision?: number }> : null)
    .catch(() => null);
  return NextResponse.json(
    {
      sessionListVersion: rustRunning?.sessionListVersion ?? 0,
      runningSessionIds: rustRunning?.runningSessionIds ?? [],
      awaitingInputSessionIds: rustRunning?.awaitingInputSessionIds ?? [],
      completionNotificationSuppressedSessionIds: [],
      subagentsActiveSessionIds: [],
      sessionUiStateRevision: rustRunning?.sessionUiStateRevision ?? null,
      serverNow: Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
