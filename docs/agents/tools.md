# Tools and runtime capabilities

Tool configuration is presented in the Next.js UI, but Pi runtime behavior is owned by `pi-rust-ynl`. The browser calls same-origin API routes; the routes preserve validation and response shapes, then forward settings and session operations to `pi-web-backend`.

## Configuration and runtime

- Global/project tool settings and cache-miss notices are served by the Rust settings routes (`/api/v1/settings/tools` and `/api/v1/settings/cache-miss-notices`). Next's `/api/tools/settings` and `/api/cache-miss-notices` are the browser-facing adapters.
- Per-session tool selection is part of the Rust session command/state API. The client persists user-visible choices through the existing agent routes and renders the returned tool list.
- Codemode availability is reported by Rust (`GET /api/v1/codemode/status`). Rust owns codemode execution and its worker limits.
- MCP tool exposure and project configuration are handled by Rust's MCP API. Next retains the Settings UI, request-origin checks, and display-only status cache.
- The terminal is a Rust backend service using `portable-pty`; `app/api/terminal/**` forwards its commands and events.

The old Pi Web `rpc-manager`, built-in extension factories, custom MCP host, and per-session SDK adapters have been removed. Do not add new Pi runtime behavior to a Next route or recreate the former TypeScript extension bridge. Implement the capability in Rust and expose a backend API; add only the browser-facing adapter and UI state needed by Next.

## UI references

Tool presets and visible tool cards remain client concerns in `lib/tool-presets.ts`, `components/MessageView.tsx`, and the Settings components. The Rust API owns the authoritative availability and execution state. Keep same-origin route validation and preserve the browser response contracts in `lib/api-types.ts` when updating those routes.
