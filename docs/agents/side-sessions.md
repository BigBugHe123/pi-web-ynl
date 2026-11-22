# Side sessions

Side sessions are persisted Pi session files and are managed by the Rust session backend. Pi Web handles the `/side` command, draft handoff, tab state and display; it does not copy or open session files with a Node `SessionManager`.

## Creation and navigation

- `/side`, the composer action, and the selected-text action send a fork request to `POST /api/sessions/[id]/fork`. The same-origin route validates the request and forwards the operation to Rust.
- Rust writes the fork and side-session boundary metadata in the session file, returning the new session identity or a refusal. The web client sends the optional initial prompt after the new session is available.
- `components/SessionChatPanel.tsx` renders a side session in an `agent:<sessionId>` tab. `AppShell` stores tabs per main session in browser session storage; tabs are client view state, not session-runtime state.
- Session listing, family membership, search, stats and deletion come from Rust session APIs. The sidebar hides relation sessions as ordinary top-level rows and opens a side-session hit with its parent context.

## Client behavior

A side tab shows the same chat UI as the main session, while keeping its draft and stream attached to its own session id. Opening a side session in the main chat closes the matching tab. Deleting a side session closes its tab; deleting a parent lets the Rust backend apply the session-family deletion rules.

The `pi-web:side` boundary remains part of the persisted transcript format because Rust session listing and the web client use it to distinguish relation sessions and scope their search/display. The client never edits or forks the JSONL file itself.

## Relevant files

- Rust session APIs: `pi-rust-ynl/crates/pi-web-backend` and the Rust session implementation.
- Routes/client: `app/api/sessions/**`, `hooks/useAgentSession.ts`, `components/AppShell.tsx`, `components/SessionChatPanel.tsx`, `components/SessionTree.tsx`, `lib/side-chat-client.ts`, `lib/session-family.ts`, `lib/side-tab-state.ts`.
