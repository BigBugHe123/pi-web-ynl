# Sessions and chat UI

## Backend ownership

Rust owns session creation, lifecycle, commands, leases, state, transcript operations, search, export, fork/rename/delete, auto-naming, and SSE events. The implementation is in `pi-rust-ynl/crates/pi-web-backend/src/main.rs` and its session modules. Next's `app/api/agent/**` and `app/api/sessions/**` routes keep the browser-facing API and forward those operations to Rust; `lib/rpc-manager.ts` and the Pi Web TypeScript session runtime were removed.

The shared client in `lib/agent-client.ts` submits commands through the same-origin agent routes. `hooks/useAgentSession.ts` receives the event stream and updates the selected chat. Do not add a second Node session manager or read/write session JSONL directly in a route; add the operation to Rust and adapt the route contract.

## UI responsibilities

- `components/AppShell.tsx` owns session selection and coordinates new sessions, project cwd, tabs, and settings dialogs.
- `components/SessionSidebar.tsx`, `components/SessionTree.tsx`, and `components/AgentSessionPanel.tsx` present the session tree and running-session state returned by Rust.
- `components/ChatWindow.tsx`, `components/MessageView.tsx`, and `components/ChatInput.tsx` render messages, tool results, streaming input, and composer state. Streaming JSON display uses the local parser in `lib/streaming-json.ts`.
- Client-only preferences and view state remain in the UI, such as unread markers, sidebar layout, expansion state, and selected tabs. The sidebar's shared session/project state (pins, archive, project order/names and read times) is stored by Rust in `pi-web-session-state.json`; Next proxies `/api/sessions/ui-state` to `/api/v1/sessions/ui-state`. Transcript/session data and authoritative running state come from Rust.

Keep the wire shapes in `lib/api-types.ts` aligned with Rust responses. A browser-facing route may translate an existing contract, but the Rust service remains the source of truth for persisted session data and active session state.
