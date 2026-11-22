# MCP settings

The MCP settings panel is a browser UI backed by Rust. Rust reads the global and project MCP files, computes the overview and trust state, masks sensitive values, and performs every write. Next routes preserve the same-origin API and forward requests to `pi-web-backend`.

## Overview and display

`GET /api/mcp?cwd=...` forwards to Rust's MCP overview API. The browser receives display-safe server entries, validation/trust state, OAuth status booleans, and recent test/session status. OAuth credentials and literal secret values stay in Rust. `lib/mcp-config-values.ts` and `lib/mcp-secrets.ts` are pure presentation/preview helpers; they are not file readers or server-side config stores.

The panel lives in `components/McpConfig.tsx`; add and sign-in flows are in `components/McpAddServer.tsx` and `components/McpSignIn.tsx`. Keep API response types in `lib/api-types.ts` aligned with the Rust response contract.

## Actions and writes

`POST /api/mcp` forwards actions to Rust, including add, enable/disable, remove, undo, exposure changes, project overrides, and sign-out. Rust re-reads the target file, validates the entry and project trust, applies authorization and secret rules, then writes the configuration. The route must not read `mcp.json`, keep undo records, or implement a parallel trust transaction.

Adding a server uses a browser-side import preview (`lib/mcp-import.ts`) and sends a structured candidate. That preview improves the UI only; Rust performs final validation and host-variable/trust checks before it saves anything. Test and OAuth connect only after an explicit user action.

## Trust and status

Rust owns project trust decisions and project MCP config access. `GET/POST /api/project-trust` are forwarding adapters. Test results, OAuth flow state, and session MCP status are maintained by the Rust backend; they are not cached in a Next process. Project operations must pass Rust's path authorization and trust checks even when the UI has already shown the project as trusted.

See [MCP runtime](mcp-runtime.md), [MCP add](mcp-add.md), and [MCP test and sign-in](mcp-test-sign-in.md) for the corresponding flows.
