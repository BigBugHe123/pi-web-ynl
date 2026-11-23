# MCP settings and runtime

The MCP settings panel is a browser UI backed by Rust. Rust reads the global and project MCP files, computes the overview and trust state, masks sensitive values, and performs every write. Next routes preserve the same-origin API and forward requests to `pi-web-backend`.

## Overview and display

`GET /api/mcp?cwd=...` forwards to Rust's MCP overview API. The browser receives display-safe server entries, validation/trust state, OAuth status booleans, and recent test/session status. OAuth credentials and literal secret values stay in Rust. `lib/mcp-config-values.ts` and `lib/mcp-secrets.ts` are pure presentation/preview helpers; they are not file readers or server-side config stores.

The panel lives in `components/McpConfig.tsx`; add and sign-in flows are in `components/McpAddServer.tsx` and `components/McpSignIn.tsx`. Keep API response types in `lib/api-types.ts` aligned with the Rust response contract.

## Actions and writes

`POST /api/mcp` forwards actions to Rust, including add, enable/disable, remove, undo, exposure changes, project overrides, and sign-out. Rust re-reads the target file, validates the entry and project trust, applies authorization and secret rules, then writes the configuration. The route must not read `mcp.json`, keep undo records, or implement a parallel trust transaction.

Adding a server uses a browser-side import preview (`lib/mcp-import.ts`) and sends a structured candidate. That preview improves the UI only; Rust performs final validation and host-variable/trust checks before it saves anything. Test and OAuth connect only after an explicit user action.

## Trust and status

Rust owns project trust decisions and project MCP config access. `GET/POST /api/project-trust` are forwarding adapters. Test results, OAuth flow state, and session MCP status are maintained by the Rust backend; they are not cached in a Next process. Project operations must pass Rust's path authorization and trust checks even when the UI has already shown the project as trusted.

## Add, test, and sign in

The browser parses pasted configuration into a preview in `lib/mcp-import.ts`. `components/McpAddServer.tsx` submits a structured candidate; it must not read local files, resolve host secrets, or connect to a server. Rust rechecks the request, allowed project path, trust state, server-name conflicts, secret rules, and host-environment confirmations before writing atomically. A fresh-folder trust-and-add flow is handled as one backend operation. A preview is never authorization or final validation.

Test and OAuth sign-in require an explicit user action. The browser sends `{ scope, name, cwd? }`, never a connection configuration. Rust resolves the named entry from its config, applies project overrides and namespace rules, checks path authorization and trust, rejects operator-disabled MCP and `PI_WEB_PASSWORD` references, then connects or starts OAuth. The Rust connection layer strips Pi Web host-only environment variables from project commands, resolves configured values, and masks secrets and server-provided error text.

The backend routes include `POST /api/v1/mcp/test`, `POST /api/v1/mcp/sign-in`, `GET /api/v1/mcp/sign-in/{id}`, `POST /api/v1/mcp/sign-in/{id}/redirect`, `DELETE /api/v1/mcp/sign-in/{id}`, and `POST /api/v1/mcp/sign-out`. OAuth flows outlive the start request; the UI polls, submits a pasted redirect, or cancels through forwarding routes. Rust owns flow state, credentials, `mcp-auth.json`, and Test/sign-in display status. Keep response types in `lib/api-types.ts` and display behavior in `components/McpConfig.tsx` and `components/McpSignIn.tsx` aligned with the Rust contract.

## Relevant code

- Rust backend: `pi-rust-ynl/crates/pi-web-backend/src/mcp_*`, `project_trust.rs`; transport/runtime also lives in `pi-rust-ynl/crates/pi-mcp`.
- Next adapters: `app/api/mcp/**` and `app/api/project-trust/route.ts`.
- Browser UI and pure preview helpers: `components/McpConfig.tsx`, `components/McpAddServer.tsx`, `components/McpSignIn.tsx`, `lib/mcp-import.ts`, `lib/mcp-config-values.ts`, and `lib/mcp-secrets.ts`.
