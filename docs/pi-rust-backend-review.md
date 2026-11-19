# Pi Web and pi-rust backend review

## Implementation status

The first HTTP backend now lives in `pi-rust-yll-main/crates/pi-web-backend`. It keeps multiple `AgentSessionRuntime`s in one Rust process and exposes versioned session create/state/command/SSE endpoints. Pi Web's central agent client, new-session flow, event source, full-state reads, and lease renewal use same-origin `/api/v1/*` paths, which Next rewrites to this loopback-only service. Commands reuse YLL's `RpcCommand` JSON shape, plus Pi Web's `get_tools`, `set_tools`, `navigate_tree`, and `abort_compaction` operations.

Run the Rust service from the YLL checkout with `cargo +1.98.1 run -p pi-web-backend` (default `127.0.0.1:3030`), then run Pi Web with `npm run dev` from its checkout. Set `NEXT_PUBLIC_PI_RUST_BACKEND_URL` in Pi Web's environment to change the backend URL.

This is an agent-runtime integration, not a complete Rust-hosted Pi Web distribution. Next.js still serves the UI and its existing settings, auth, files, Git, terminal, MCP, plugin, and skill routes. Extension UI requests, live extension status/widgets, and a few lower-frequency RPC commands are not bridged yet. Pi Web's existing API routes that load the TypeScript SDK remain in place for those non-agent features.

## Current architecture

- `pi-web-main` is a Next.js application. The browser calls same-origin `/api/*` routes; those routes use the embedded TypeScript `@earendil-works/pi-coding-agent` SDK.
- Agent commands are wrapped by `lib/agent-client.ts`. Streaming is a separate `EventSource` connection from `hooks/useAgentSession.ts` to `/api/agent/[id]/events`.
- New-session startup goes through `/api/agent/new`. Session browsing, settings, model/provider auth, files, Git, terminals, MCP, plugins, and skills use their own Next route handlers. There are 68 `app/api/**/route.ts` files.
- `pi-rust-yll-main` reads/writes Pi-compatible configuration and JSONL session files. It provides `AgentSession` and `pi --mode rpc`; RPC accepts JSON commands on stdin and emits responses and session events as JSON lines.
- YLL's `pi-server` is an experimental Chord service router, not an HTTP API. Its provided transport is Unix-domain sockets behind `cfg(unix)`, so it is not directly usable by the Windows/browser setup. `pi-chord` also has a generic WebSocket host, but it does not define the Pi Web REST/SSE contract.

## Interface compatibility

| Concern | Pi Web currently expects | YLL already provides | Gap |
| --- | --- | --- | --- |
| Session runtime | One TypeScript `AgentSession` object managed by the Next server | Rust `AgentSession`; JSONL session format and config paths compatible with Pi | Runtime must be constructed in the Rust service or exposed over a network API |
| Command transport | `POST /api/agent/[id]` with Pi Web command objects | `pi --mode rpc`: JSONL request/response protocol; many command names match Pi | Add HTTP/WebSocket transport and session routing |
| Streaming | SSE records containing Pi JSON session events | Same event records on RPC stdout | Forward events over SSE/WebSocket; preserve reconnect and startup ordering |
| Core commands | `prompt`, `abort`, state/model/thinking controls, bash, compaction, fork/clone, queue controls | RPC supports most standard Pi commands | The HTTP adapter covers core chat and Pi Web's tool/tree/compaction calls; a few RPC commands still return unsupported |
| Extension UI | Pi Web calls its session API for extension responses and inputs | YLL RPC accepts extension UI response records and emits Pi events | HTTP UI request/response hosting remains to be added |
| Session creation | Next route creates the SDK session and returns its ID/model | Rust can create/open a session in-process using `SessionManager` and `AgentSession` | Add create/open/list/close and working-directory validation to the web service |
| Models and auth | Many Next routes use the TypeScript SDK for model catalogs, API keys, OAuth, and tests | YLL reads compatible `models.json`, `auth.json`, and settings | File compatibility helps, but OAuth/device login and model discovery APIs need explicit ownership or proxying |
| Other UI APIs | Separate routes for files, Git, terminals, MCP, plugins, skills, worktrees, UI state, etc. | YLL libraries implement many corresponding local capabilities, not Pi Web's HTTP contract | Full Rust-hosted replacement is much larger than the agent API bridge |

## Recommended boundary

Use one Rust web-service process that owns a map of session IDs to in-process YLL sessions. Each session gets its own Rust `AgentSession`/runtime, while all sessions share the service process and the configured Pi agent directory. Do not spawn one `pi` process per conversation.

Expose a small versioned HTTP API for session creation/opening, command submission, session state, and an SSE event stream. Keep command/event JSON close to Pi RPC so the existing UI client needs only a transport adapter. Treat unsupported Pi Web-only commands as explicit capabilities rather than silently ignoring them.

## Scope and estimate

- **Agent chat integration:** moderate. Add the Rust HTTP service, in-process multi-session lifecycle, event streaming, and an adapter for the centralized agent client plus the separate new-session and event-stream calls. Cover the Pi Web-only command gaps listed above.
- **Rust service hosts the complete Pi Web app:** large. Pi Web is not a static SPA today: it has 68 server API route files and its Next build runs a Node server. Serving it from Rust requires either keeping Next as the UI/API host and proxying agent calls, or porting/replacing the wider route surface before the Rust service can host the full UI itself.
- **Recommended delivery:** first build the Rust session/agent API and switch the frontend agent transport to it while retaining Next for existing non-agent endpoints. After the chat path works, decide which configuration/file routes should move into Rust. This gives YLL in-process multi-session execution without pretending every Pi Web setting is already supported by YLL.

## Dependency

Axum 0.8.9 was approved for the HTTP/SSE service and added as a workspace dependency.
