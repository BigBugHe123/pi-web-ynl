# Models, providers, and credentials

## Backend ownership

The Rust backend is authoritative for provider/model discovery, catalog refresh, model configuration, enabled-model resolution, default preferences, provider credentials, OAuth/API-key operations, and provider usage. Routes are registered in `pi-rust-ynl/crates/pi-web-backend/src/main.rs`; model configuration, enabled-model settings, provider usage, and OAuth handling live in adjacent modules.

Next's `app/api/models/**`, `app/api/models-config/**`, `app/api/auth/**`, and `app/api/provider-usage/**` routes retain browser request validation and existing response formats, then forward operations to Rust. Model files and credential state must be read or changed by the Rust service; do not reintroduce a Next `ModelRuntime` or Pi SDK provider catalog.

## UI behavior

- `components/ModelsConfig.tsx` edits the models configuration and displays validation/discovery results returned by the API.
- `components/EnabledModelsSection.tsx` presents the Rust-resolved provider/model catalog and enabled patterns. The selection UI keeps its browser-facing provider names, model references, and stale-pattern notices.
- `components/ModelSelector.tsx` and `components/SelectorRow.tsx` handle current-chat selection and saved default indicators. Defaults and enabled-model settings persist through the model API routes.
- `components/ProviderUsage.tsx` displays usage queried by the backend without exposing credentials to the browser.

Keep `lib/api-types.ts` contracts aligned with the Rust response types. Provider secrets and OAuth tokens never belong in a browser response. When extending model behavior, implement resolution and provider-specific runtime work in Rust, then keep the Next adapter limited to the established HTTP contract.
