# Adding MCP servers

The browser parses pasted configuration into a preview in `lib/mcp-import.ts`. `components/McpAddServer.tsx` lets the user review and fill fields, then submits a structured candidate through `POST /api/mcp`. The Next route forwards it; Rust owns the final decision and write.

## Rust responsibilities

Before writing, Rust rechecks the request, project path and trust state; validates the candidate; checks server-name conflicts; rejects forbidden `PI_WEB_PASSWORD` references; and applies secret and host-environment confirmation rules. It reads the current config and writes atomically. A client preview is not authorization and must never be trusted as final validation.

For a project target, Rust enforces the project's trust decision. A fresh-folder trust-and-add flow is available only when Rust's checks allow it, and trust/config changes are handled together by the backend. The browser displays the typed result and refreshes the overview after success or refusal.

## Preview and connection

The import parser is pure browser-side code. It may translate supported client formats and show warnings, but it must not read local files, resolve host secrets, or connect to a server. The user explicitly adds the candidate before any connection; Test or OAuth sign-in is a separate action forwarded to Rust.

Keep the browser contract in `lib/api-types.ts`, import and preview logic in `lib/mcp-import.ts`, and UI behavior in `components/McpAddServer.tsx`/`components/McpConfig.tsx`. Rust remains responsible for parsing and validating the saved form before use.
