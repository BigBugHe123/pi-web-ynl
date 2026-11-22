import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { ProviderEntryError, checkProviderEntries } = await jiti.import("./model-provider-check.ts");

const URL = "http://127.0.0.1:1/v1";
const CASES = [
  ["Add provider's untouched stub", { "new-provider": { api: "openai-completions" } }, ["new-provider", "empty"]],
  ["an entry with nothing in it", { relay: {} }, ["relay", "empty"]],
  ["an empty models list", { relay: { api: "openai-completions", models: [] } }, ["relay", "empty"]],
  ["an empty modelOverrides", { "openai-codex": { modelOverrides: {} } }, ["openai-codex", "empty"]],
  ["oauth without a Base URL", { relay: { oauth: "radius", models: [] } }, ["relay", "baseUrl"]],
  ["one bad provider among good ones", {
    ok: { baseUrl: URL, api: "openai-completions", apiKey: "TEST_ONLY_KEY", models: [{ id: "AURA-think" }] },
    "new-provider": { api: "openai-completions" },
  }, ["new-provider", "empty"]],
  ["a context-window override Settings writes", { "openai-codex": { modelOverrides: { "gpt-6-astra": { contextWindow: 500000 } } } }, null],
  ["an API key alone", { relay: { apiKey: "TEST_ONLY_KEY" } }, null],
  ["empty headers", { relay: { headers: {} } }, null],
  ["authHeader false", { relay: { authHeader: false } }, null],
  ["a complete custom provider", { relay: { baseUrl: URL, api: "openai-completions", apiKey: "TEST_ONLY_KEY", models: [{ id: "a" }] } }, null],
];

function refusal(providers) {
  try {
    checkProviderEntries({ providers });
    return null;
  } catch (error) {
    assert.ok(error instanceof ProviderEntryError, String(error));
    return [error.provider, error.problem];
  }
}

test("refuses incomplete provider entries and accepts usable entries", () => {
  for (const [name, providers, expected] of CASES) {
    assert.deepEqual(refusal(providers), expected, name);
  }
});

test("models the store drops for a blank id do not count", () => {
  assert.deepEqual(refusal({ "new-provider": { api: "openai-completions", models: [{ id: " " }] } }), ["new-provider", "empty"]);
});
