# Rust-hosted static frontend

The Rust backend can serve both the static Pi Web frontend and its API. The
frontend is exported without Next API routes or the Next request proxy; the
browser's existing `/api/*` requests are handled by Rust compatibility routes.
Next does not need to run in this deployment.

## Build and install beside the backend executable

From `pi-web-ynl`, run:

```bash
npm run build:backend-static
cargo +1.98.1 build -p pi-coding-agent -p pi-web-backend
```

The first command exports the frontend to `pi-web-ynl/out/` and copies it to
`pi-rust-ynl/target/debug/web/`, beside the debug executable. Start the backend
as usual, then open its address (default `http://127.0.0.1:3030`). The same
process serves the UI and handles `/api/*` and `/api/v1/*` requests.

Build `pi-coding-agent` with the backend as shown above: the subagents
extension starts child agents by launching the separate `pi` CLI. Make it
discoverable through `PI_BIN` or the extension's `piBin` setting in
`~/.pi/agent/ext/subagents.json`; otherwise the extension falls back to finding
`pi` on the backend process's `PATH`.

For a release binary, copy to the matching profile before building it:

```powershell
$env:PI_WEB_BACKEND_PROFILE = "release"
npm run build:backend-static
cargo +1.98.1 build -p pi-coding-agent -p pi-web-backend --release
```

The runtime looks for a `web/` folder beside the executable. Override that
location with `PI_WEB_STATIC_DIR`; an absolute path is recommended for service
configurations. If the variable is relative, it is resolved from the executable
directory. In a source checkout, when no adjacent `web/` exists, the backend
also checks `pi-web-ynl/out/` for development convenience.

If `PI_WEB_PASSWORD` is set, Rust protects API routes and the static client
redirects unauthenticated users to `/login`. Without it, the backend stays open
as before. Static hosting does not require Nginx; Nginx can still sit in front
for TLS or a custom public port.

The frontend export contains a build-time `manifest.webmanifest`; set
`PI_WEB_APP_NAME` before building to choose the installed app name. Set
`PI_RUST_BACKEND_VERSION` if the UI should display the paired backend version.
