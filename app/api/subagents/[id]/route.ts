import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RETIRED = {
  error: "The Pi-Web subagent runtime has been retired. Use the Rust-managed subagent plugin through its parent session.",
};

export async function GET() {
  return NextResponse.json(RETIRED, { status: 410, headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  return NextResponse.json(RETIRED, { status: 410, headers: { "Cache-Control": "no-store" } });
}
