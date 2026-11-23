import { backendUrl } from "@/lib/server/backend-url";
import { NextResponse } from "next/server";
import { cwdMissingBody } from "@/lib/missing-cwd";

const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
const backend = backendUrl();

export async function POST(req: Request) {
  let commandType: string | undefined;
  try {
    const body = await req.json() as Record<string, unknown>;
    const { cwd, ...command } = body;
    commandType = typeof command.type === "string" ? command.type : undefined;
    if (typeof cwd !== "string" || !cwd) return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    if (command.thinkingLevel !== undefined && !THINKING_LEVELS.has(String(command.thinkingLevel))) throw new Error(`Invalid thinking level: ${String(command.thinkingLevel)}`);
    const response = await fetch(new URL("/api/v1/sessions", backend), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cwd, ...command }), cache: "no-store", signal: req.signal,
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || result.error) return NextResponse.json({ ...result, ...(commandType === "prompt" ? { code: "prompt_rejected", accepted: false } : {}) }, { status: response.status });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ...(message.includes("does not exist") ? cwdMissingBody(message.split(": ").slice(1).join(": ")) : { error: message }), ...(commandType === "prompt" ? { code: "prompt_rejected", accepted: false } : {}) }, { status: 502 });
  }
}
