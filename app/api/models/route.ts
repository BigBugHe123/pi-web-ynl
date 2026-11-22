import {
  withSafeModelLoadFailure,
  type ModelsData,
} from "@/lib/models-cache";

export const dynamic = "force-dynamic";

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

const EMPTY_MODELS: ModelsData = {
  models: {},
  modelList: [],
  defaultModel: null,
  defaultThinkingLevel: null,
  savedDefaultThinkingLevel: null,
  thinkingLevels: {},
  thinkingLevelMaps: {},
  thinkingLevelPins: {},
  isScoped: false,
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  try {
    const target = new URL("/api/v1/models", backend);
    for (const [key, value] of url.searchParams) target.searchParams.append(key, value);
    const response = await fetch(target, { cache: "no-store", signal: req.signal });
    const body = await response.json() as ModelsData & { reason?: string };
    if (response.status === 400 && body.reason === "cwd-missing") {
      return Response.json(body, { status: 400 });
    }
    if (response.status === 400 || response.status === 403) {
      return Response.json(body, { status: response.status });
    }
    if (!response.ok) throw new Error(`Rust backend returned HTTP ${response.status}`);
    return Response.json(body);
  } catch {
    return Response.json(withSafeModelLoadFailure(EMPTY_MODELS));
  }
}
