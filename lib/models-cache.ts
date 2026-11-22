export interface ModelsData {
  models: Record<string, string>;
  modelList: { id: string; name: string; provider: string; providerName: string; input?: string[] }[];
  defaultModel: { provider: string; modelId: string } | null;
  /** Resolved thinking level a new session starts with when the user has not picked one. */
  defaultThinkingLevel: string | null;
  /** `defaultThinkingLevel` as saved in settings, which the reasoning selector's star marks. */
  savedDefaultThinkingLevel: string | null;
  thinkingLevels: Record<string, string[]>;
  thinkingLevelMaps: Record<string, Record<string, string | null>>;
  /** `provider/modelId` thinking level pinned by an `enabledModels` `:level` suffix. */
  thinkingLevelPins: Record<string, string>;
  modelError?: string;
  /** Warnings from resolving the `enabledModels` scope (e.g. a pattern matched nothing). */
  modelScopeWarnings?: string[];
  /** True when enabledModels is active and restricting the model list. */
  isScoped?: boolean;
}

const backend = process.env.PI_RUST_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
  ?? "http://127.0.0.1:3030";

/** Invalidate the Rust-owned model catalog cache after a successful mutation. */
export async function invalidateModelsCache(): Promise<void> {
  try {
    await fetch(new URL("/api/v1/models/cache/invalidate", backend), {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // A successful mutation remains successful; the Rust cache expires after 60 seconds.
  }
}

export function withSafeModelLoadFailure(data: ModelsData): ModelsData {
  return { ...data, modelError: "Model list is temporarily unavailable. Check your configuration and try again." };
}
