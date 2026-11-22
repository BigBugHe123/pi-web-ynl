# Pi Web and pi-rust backend

## Current architecture

Pi Web keeps Next.js as the UI server and same-origin gateway. Browser calls to `/api/*` are validated and forwarded to `pi-rust-ynl/crates/pi-web-backend` using `PI_RUST_BACKEND_URL` (default `http://127.0.0.1:3030`). Rust owns session/runtime behavior and the former Pi Web backend operations, including agent-directory configuration, workspace files, Git/worktrees, password authentication decisions, VAPID/subscription storage, and app-update checks. Pi SDK packages are absent from the root manifests and lockfiles; production code and the demo do not import them.

Rust owns session lifecycle, commands and SSE, session history and sidebar state, model configuration and enabled-model operations, provider credentials and OAuth, MCP configuration/connection/OAuth, project trust, skills, plugins, terminal processes, tool settings, subagent profile/settings files, default preferences, provider usage, cwd selection, file browsing and uploads, file indexing, Git status/diff, worktrees, bash output, push subscription storage, and app-update checks. Password verification, Basic auth, signed session tokens, and throttling also live in Rust. The API routes are registered in `pi-rust-ynl/crates/pi-web-backend/src/main.rs`; feature implementations live in adjacent Rust modules.

Next remains responsible for serving the React UI and acting as the same-origin gateway: it performs browser host/origin checks, adapts response details and streams, redirects to login, and sets or clears the HttpOnly auth cookie. The `/api/files` routes stream the Rust responses; authorization roots and file operations are Rust-owned. `open-in-explorer` is disabled when the configured Rust URL appears remote; set `PI_RUST_BACKEND_SAME_HOST=1` only when the Rust process can open the browser computer's desktop file manager. DOCX preview is a Rust OOXML implementation covering paragraphs, headings, basic emphasis, lists, tables, and embedded images; complex style mapping and some Word-specific constructs may differ from Mammoth. Push subscriptions are stored in Rust, but the removed Node completion sender had no production caller; current subscription registration does not imply that server-side completion alerts are dispatched.

## Backend development

From the Rust workspace, run `cargo +1.98.1 run -p pi-web-backend` (default bind address `0.0.0.0:3030`). Run the UI from `pi-web-ynl` with `npm run dev`. Set `PI_RUST_BACKEND_URL` or `NEXT_PUBLIC_PI_RUST_BACKEND_URL` when the service is not at the default address.

The Pi SDK is no longer a dependency of Pi Web, including development dependencies. Production runtime and configuration behavior belongs in Rust and should be exposed through a versioned backend route, with Next kept as the same-origin adapter where the browser needs one.

## Remaining boundary

The Rust service does not serve the Next application itself. Next still serves the UI and retains thin same-origin route/proxy adapters because the browser uses the existing `/api/*` contract. Keep those adapters limited to request security, cookie/redirect handling, response compatibility, and streaming; new application state and filesystem operations belong in Rust.
