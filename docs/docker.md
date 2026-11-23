# Running Pi Web in Docker

This project ships a production image and a Compose example. The image runs the Next.js UI gateway as the unprivileged `node` user on port `30141`; the Rust `pi-web-backend` runs separately and owns the application backend. The Compose example requires a password so the high-privilege UI is not accidentally exposed without authentication.

## Start with Compose

```sh
cp .env.example .env
# Edit .env and set PI_WEB_PASSWORD to a long, unique secret.
# Start pi-web-backend separately with the same PI_WEB_PASSWORD.
mkdir -p workspace
docker compose up --build -d
```

Open <http://localhost:30141>. The published port is bound to host loopback only. To use another local port, set `PI_WEB_PORT` in `.env`; the application still listens on `30141` inside the container.

The equivalent Podman command is `podman compose up --build -d` when the Compose provider is installed. To build without Compose, run `podman build -t pi-web .`.

## Backend data and project paths

The Compose service is only the Next.js UI gateway and has no agent-data or workspace volumes. The Rust backend owns sessions, credentials, settings, files, Git, terminals, and project access. It must run in a filesystem environment that can read the intended Pi agent directory and project paths. When running the backend on the Docker host (the default Compose URL), those paths are host paths and need no mount into the UI container. If you containerize the Rust backend separately, mount persistent data and project directories into that backend container and configure matching absolute paths there; do not mount them into the UI container.

## Environment variables

The Compose file explicitly sets the following:

| Variable | Container value / requirement | Purpose |
| --- | --- | --- |
| `PORT` | `30141` | Internal HTTP port. Keep the Compose container port in sync if you change it. |
| `PI_WEB_HOSTNAME` | `0.0.0.0` | Required for access through the container network; Pi Web's normal non-container default is loopback-only. |
| `PI_WEB_NO_OPEN` | `1` | Prevents attempts to open a browser in the container. |
| `PI_WEB_PASSWORD` | Required by the Compose interpolation | Enables browser password login. Use a strong secret. |
| `PI_RUST_BACKEND_URL` | Defaults to `http://host.docker.internal:3030` | Server-side URL for `pi-web-backend`; the Rust process must use the same `PI_WEB_PASSWORD`. Set this to the Rust service name when both run in Compose. |
| `PI_RUST_BACKEND_SAME_HOST` | Auto-detected for loopback and `host.docker.internal`; otherwise off | Override the Open in Explorer locality check. Set to `1` only if the Rust process can open the desktop file manager on the same computer as the browser; set to `0` to disable it. |
| `PI_WEB_ALLOWED_HOSTS` | Optional, empty by default | Comma-separated, exact proxy/custom hostnames. Set this when a reverse proxy forwards a hostname not otherwise accepted by Pi Web. |
| `PI_WEB_SKIP_VERSION_CHECK` | `1` | Disables the Pi Web update check in this deployment. |

There are no model API keys required to start the web UI. Configure provider credentials in the Models panel; the Rust backend persists them in its agent directory. Provider API requests still require network access unless using a local provider.

The Rust service is not bundled in this UI image. Run it separately, expose its port to the Pi Web container, and give both processes the same `PI_WEB_PASSWORD`; otherwise the UI fails closed with an authentication-backend error.

Set UI variables under the `pi-web` service and backend variables on the separate Rust process or service. Compose uses `.env` for interpolation; adding a variable there alone does not pass it into a container. See [Docker's environment variable documentation](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/). For example, add this entry alongside the existing UI environment entries in `compose.yaml`:

```yaml
      PI_WEB_APP_NAME: ${PI_WEB_APP_NAME:-Pi Web}
```

Then set `PI_WEB_APP_NAME=Work Pi` in `.env` and run `docker compose up -d` to recreate the service with the updated environment. `docker compose restart` retains the container's existing environment. Apply the same explicit mapping for the optional variables below:

- `PI_WEB_APP_NAME`: PWA manifest name.
- `PI_WEB_PERF`: UI gateway performance diagnostics.

Rust backend variables must be set on the backend process:

- `PI_CODEMODE_MAX_WORKERS`: code-mode worker limit.
- `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`: outbound proxy configuration.
- `PI_OFFLINE`: disable online model-catalog/plugin checks.
- `PI_WEB_DISABLE_MCP`: disable MCP integration.
- `PI_WEB_PUSH_SUBJECT`: optional Web Push VAPID subject.
- `GITHUB_TOKEN` or `GH_TOKEN`: optional GitHub API token used by skill update checks; `SKILLS_API_URL` overrides the skills service base URL.
- `PI_WEB_SSE_BACKLOG_LIMIT_BYTES`: SSE backpressure tuning.

Refer to the Configuration section of the main README for option defaults and validation details. Never bake passwords or provider tokens into the image.

## Security notes

Pi Web can invoke tools, run shell commands, edit project files, and access the agent credentials in its mounted agent directory. Treat the service as a trusted local application, not a public website. Compose binds the published port to `127.0.0.1`; for remote access, use a trusted HTTPS reverse proxy or VPN, keep password authentication enabled, and configure `PI_WEB_ALLOWED_HOSTS` for the forwarded hostname. Do not expose plain HTTP to the public internet.

The mounted workspace is writable by the agent. Only mount directories you intend Pi Web to access. Keep the writable agent directory and provider credentials private.

## Released images

Pushing a `v*` release tag makes the Release workflow (`.github/workflows/publish.yml`) publish `linux/amd64` and `linux/arm64` images to GHCR, next to the npm package: `ghcr.io/agegr/pi-web:<version>`, `:<major>.<minor>` and `:latest`. It uses the built-in `GITHUB_TOKEN`, so no registry secret is needed.

To run a released image instead of building one, replace the `build:` section in `compose.yaml` with:

```yaml
    image: ghcr.io/agegr/pi-web:latest
```
