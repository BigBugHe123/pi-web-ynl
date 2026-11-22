# MCP runtime

Rust in `pi-rust-ynl/crates/pi-web-backend` owns MCP configuration reads and writes, validation, trust decisions, server connections, OAuth state and credentials, and UI status. The Next routes under `app/api/mcp` and `app/api/project-trust` keep the browser-facing contract and forward requests to Rust; they do not maintain a second MCP runtime or config store.

## Request flow

- `GET /api/mcp` forwards the overview request. Rust reads global/project configuration, applies trust and override rules, redacts secrets, and includes settings and status.
- `POST /api/mcp` forwards add, edit, enable/disable, remove, undo, exposure, and sign-out actions. Rust revalidates the action and performs file writes.
- `/api/mcp/test` and `/api/mcp/sign-in/**` forward explicit connection and OAuth actions. The browser sends a server identity, not a connection configuration.
- `/api/project-trust` forwards trust status and decisions. Rust owns the trust store and project MCP listing.
- Agent MCP connections and per-session status are handled by the Rust runtime; Next only adapts requests and streams.

## Safety

Rust is the authority for allowed paths, project trust, parsing and validating MCP entries, secret redaction, and writes. Do not reintroduce Node filesystem access or MCP SDK runtime code in these routes. Browser import and preview helpers may build a candidate, but Rust must validate it again before connecting or writing.

## Relevant code

- Rust backend: `pi-rust-ynl/crates/pi-web-backend/src/mcp_*` and `project_trust.rs`; MCP transport/runtime also lives in `pi-rust-ynl/crates/pi-mcp`.
- Next adapters: `app/api/mcp/**` and `app/api/project-trust/route.ts`.
- Browser UI and pure preview helpers: `components/McpConfig.tsx`, `components/McpAddServer.tsx`, `components/McpSignIn.tsx`, `lib/mcp-import.ts`, and `lib/mcp-config-values.ts`.
