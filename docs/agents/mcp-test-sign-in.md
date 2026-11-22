# Settings MCP: Test and sign-in

The Next routes under `app/api/mcp/test` and `app/api/mcp/sign-in` are same-origin request-security and JSON adapters. They forward `{ scope, name, cwd? }`; the browser never supplies a connection config. Rust reads the configured global or project `mcp.json`, applies project overrides and namespace rules, checks the allowed root and project trust, rejects operator-disabled MCP and `PI_WEB_PASSWORD` references, then tests the server or starts OAuth.

## Rust routes

- `POST /api/v1/mcp/test`: resolve the named entry from Rust-owned config, connect, enumerate tools, return a masked result, and record the result in Rust MCP UI state.
- `POST /api/v1/mcp/sign-in`: resolve and validate the configured entry, then start or join an OAuth flow.
- `GET /api/v1/mcp/sign-in/{id}`: read flow state and record a terminal result in Rust MCP UI state.
- `POST /api/v1/mcp/sign-in/{id}/redirect`: submit a pasted redirect URL.
- `DELETE /api/v1/mcp/sign-in/{id}`: cancel a flow.
- `POST /api/v1/mcp/sign-out`: remove the server's OAuth credentials and end its active flow.
- `POST /api/v1/mcp/config/auth-status`: return only `signedIn` and `stored` booleans for configured OAuth servers.
- `/api/v1/mcp/ui-state/status/*`: keep Test and completed sign-in display status in the Rust process.

Rust owns MCP connections, OAuth flow state and credentials, `mcp-auth.json`, config-file resolution, and MCP UI status. The Next flow-ID route only forwards polling, redirect, and cancellation requests; it does not write status. The pure import parser used by the browser preview is not used by these server routes.

## Security and response behavior

Rust rechecks the allowed project path and trust before it connects, so Next origin/content-type checks are only the browser request boundary. Project MCP operations require an explicit trust decision. The Rust connection layer strips Pi Web's host-only environment variables from project commands, resolves configured values, and masks secrets and server-provided error text before returning results.

The OAuth flow outlives the start request. The UI polls the flow route and may paste a redirect or cancel; Rust owns the flow and credentials. Keep the browser-facing response types in `lib/api-types.ts` and display behavior in `components/McpConfig.tsx` and `components/McpSignIn.tsx` compatible when changing the Rust contract.
