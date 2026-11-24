# Pi Web - Development Notes

## Quick Start

```bash
npm run dev   # port 30141
```

Typecheck: `node_modules/.bin/tsc --noEmit` 路 Lint: `npm run lint`

**Never run `next build` during dev**: it pollutes `.next/` and breaks `npm run dev`.

### Dev server troubleshooting

- First run `lsof -nP -iTCP:30141 -sTCP:LISTEN` and reuse a healthy Pi Web process. A second `next dev` on another port is no workaround: both contend for `.next/dev/lock`.
- A browser-only `Module ... factory is not available` overlay usually means that tab has a stale Turbopack/HMR graph, not a broken server or source. Use the browser's explicit reload, then compare the server log and a direct HTTP/API request.
- Restart only when the failure reproduces from a fresh page and the server-side checks fail too: stop that exact dev process gracefully, move `.next` into a `mktemp -d` backup, restart with `npm run dev`.
- Never fall back to `next dev --webpack`: the dev graph can fail on `undici` imports such as `node:console`. Development uses Turbopack.
- `next dev` may append a generated `BEGIN:nextjs-agent-rules` block to `AGENTS.md`. It is tooling output: check `git status` and keep it out of unrelated commits.

### Rust backend

Pi runtime and application backend behavior belongs to `pi-rust-ynl/crates/pi-web-backend`, including Pi configuration, workspace files/Git/worktrees, authentication decisions, push subscription storage, and app-update checks. The Pi TypeScript SDK is no longer a dependency in the root manifests or lockfiles. Next remains the browser/UI server and thin same-origin gateway for request checks, cookies/redirects, response adaptation and streaming. See [the current backend architecture](docs/pi-rust-backend-review.md).

The Web package is an independent Next.js application and must build without reading sibling Rust workspace files. `app/api` contains same-origin BFF adapters; keep business logic and persistence in Rust. Use npm and `package-lock.json` as the single package-management source of truth.

---

## Architecture

- **Browsing**: `GET /api/sessions` and the session detail routes proxy Rust session APIs for JSONL-backed session data and running state.
- **Sending**: `POST /api/agent/[id]` forwards commands to the Rust session runtime; do not add a Node `rpc-manager` or SDK session wrapper.
- **Events**: `GET /api/agent/[id]/events` adapts the Rust event stream to the browser's SSE contract.
- **Product scope**: a light web wrapper around pi, not an IDE or a platform of its own. Before adding a feature, check the out-of-scope list in [CONTRIBUTING.md](CONTRIBUTING.md).
- **Extension compatibility (principle)**: extensions written for the pi CLI must behave the same here. Fix display problems in the web client; never add pi-web-only options or fields to the extension API (`ctx.ui.*` options, `extension_ui_request`). The Pi CLI TUI is the reference for what an extension asking for something means.

## UI Copy

Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

## Bug Fixes

Fix a bug at its cause, reasoning from first principles and established best practice. Do not patch over the symptom.

---

## API Routes

Each route's methods and parameters; code elsewhere is found by name (`ls lib components hooks`) and through the topic notes' file lists.

```
app/api/
  sessions/route.ts                GET list all sessions
  sessions/[id]/route.ts           GET/PATCH/DELETE a session
  sessions/[id]/context/route.ts   GET ?leafId=&tail=&before= a page of a leaf's context (tail defaults to 50; before pages upward; leafId defaults to pi's leaf, named in the reply)
  sessions/[id]/export/route.ts    GET exported HTML
  sessions/[id]/fork/route.ts      POST copy the session's current branch into a new session, or { side: true } a side chat (never starts an AgentSession)
  sessions/delete/route.ts         POST { ids } delete sessions and their subagents (a project's Delete all sessions); running ones kept
  sessions/stats/route.ts          POST { ids } each session's tokens, cost, tool calls, active time (the agent switcher's rows)
  sessions/[id]/state/route.ts     GET live wrapper state while running
  sessions/ui-state/route.ts       GET/POST proxy for Rust-owned sidebar pins, archive, project order/names and read times
  sessions/[id]/auto-name/route.ts POST generate a session title
  sessions/search/route.ts         GET session search
  agent/new/route.ts               POST { cwd, type: prompt|ensure_session (start only), message?, toolNames?, provider?, modelId?, thinkingLevel? }
  agent/[id]/route.ts              GET state (?systemPrompt=0: without the prompt) | POST any command
  agent/[id]/events/route.ts       GET SSE stream
  agent/[id]/lease/route.ts        POST reset the selected session's idle timer (with or without its stream; never starts one); reply: running, awaitingInput, subagentsActive
  agent/running/route.ts           GET running + awaiting-input session ids, sidebar pins/archive revision, the server's clock
  agent/debug/route.ts             GET ?session= the Debug panel's read-only snapshot: Rust agent streams, subagents/MCP and terminal page streams (fileWatches remains 0 for UI compatibility)
  auth/api-key/[provider]/route.ts POST/DELETE stored provider API key
  auth/login/[provider]/route.ts   GET OAuth/device-code SSE | POST manual code
  auth/logout/[provider]/route.ts  POST OAuth logout
  auth/providers/route.ts          GET OAuth and API-key provider lists
  cwd/validate/route.ts            POST validate/select a cwd
  cwd/browse/route.ts              GET browse any readable directory for the cwd picker | POST create child directory
  default-cwd/route.ts             POST create ~/pi-cwd/YYYYMMDD (local date)
  home/route.ts                    GET user home directory
  open-in-explorer/route.ts        GET availability | POST open a cwd in the OS file manager (loopback only)
  files/[...path]/route.ts         GET ?type=list|read|download|meta|preview|watch | POST ?type=upload|upload-check|allow-link
  file-index/route.ts              GET file list for @-mentions
  git/status/route.ts              GET changed files for a cwd
  git/diff/route.ts                GET diff of one changed file
  worktrees/route.ts               GET/POST/DELETE git worktrees
  terminal/route.ts                POST create a terminal session
  terminal/[id]/route.ts           GET { id, cwd } (404 once closed; stream at [id]/events) | POST input/resize | DELETE kill
  mcp/route.ts                     GET [?cwd=] Settings 鈥?MCP overview, files only | POST add/enable/disable/remove/undo/set-enabled/set-exposure/set-in-project/sign-out
  mcp/test/route.ts                POST { scope, name, cwd? } test one server once (entry read from its file)
  mcp/sign-in/route.ts             POST { scope, name, cwd? } start or join an OAuth sign-in
  mcp/sign-in/[flowId]/route.ts    GET flow state (polled) | POST { redirectUrl } | DELETE cancel
  project-trust/route.ts           GET trust status + project .pi/mcp.json servers (files only) | POST trust, rebuild the cwd's wrappers
  tools/settings/route.ts          GET/PUT defaultTools switches: PowerShell (Windows), Code mode automatic/always; codemode.mode, codemode.inlineBudget
  cache-miss-notices/route.ts      GET/PUT pi's global showCacheMissNotices (Settings 鈥?General)
  models/route.ts                  GET ?cwd= { models, modelList, defaultModel, 鈥?}
  models/enabled/route.ts          GET/PUT enabledModels switches
  models/default/route.ts          PUT default model / reasoning level for new sessions
  models/refresh/route.ts          POST fetch provider catalogs from pi.dev on demand
  models-config/route.ts           GET/PUT ~/.pi/agent/models.json
  models-config/catalog/route.ts   GET models.dev pricing presets
  models-config/discover/route.ts  POST fetch a configured provider's upstream model list
  models-config/test/route.ts      POST test a configured model/provider
  plugins/route.ts                 GET/POST package plugin management
  plugins/check/route.ts           POST check plugin package updates
  skills/route.ts                  GET/PATCH loaded skills, disable-model-invocation
  skills/content/route.ts          GET one loaded skill's bounded Markdown source, or ?document= a Markdown file in its folder
  skills/install/route.ts          POST install skills via npx skills add
  skills/search/route.ts           POST skills.sh search
  subagents/settings/route.ts      GET/PUT built-in subagent switch and maxConcurrent
  web-auth/route.ts                GET status | POST login | DELETE logout (browser password)
  provider-usage/query/route.ts    POST provider usage quotas
  push/config/route.ts             GET VAPID public key
  push/subscribe/route.ts          POST register a push subscription
  app-update/route.ts              GET current vs latest published pi-web version
```

---

## Topic Notes

Design decisions and traps live in `docs/agents/`, one note per area. Read the relevant note before changing that area. Runtime implementation ownership is in `pi-rust-ynl/crates/pi-web-backend`; Next files listed below are UI or same-origin API adapters unless the note says otherwise.

- [sessions.md](docs/agents/sessions.md): Rust-owned session lifecycle, storage, runtime, and APIs; Next session UI, SSE client, transcript rendering, sidebar, and debug panel. Backend: `pi-rust-ynl/crates/pi-web-backend/src/session*` and session routes; UI: `hooks/useAgentSession.ts`, `components/Session*`, `components/MessageView.tsx`, `lib/stream-client.ts`.
- [tools.md](docs/agents/tools.md): Rust-owned tool policy, codemode, MCP and terminal integration; Next settings and tool-result presentation. Backend: `pi-rust-ynl/crates/pi-web-backend/src/{tools,codemode,mcp,terminal}*`; UI adapter: `app/api/tools/settings/route.ts` and relevant settings/components.
- [mcp-settings.md](docs/agents/mcp-settings.md): MCP settings, runtime, add/test/OAuth UI and trust behavior; Rust owns config, connections, credentials, validation and persistence. See `pi-rust-ynl/crates/pi-web-backend/src/mcp_*`, `project_trust.rs` and `pi-rust-ynl/crates/pi-mcp`.
- [models.md](docs/agents/models.md): model selector and settings UI; Rust owns provider catalogs, credentials, model configuration, defaults and auth APIs. See `pi-rust-ynl/crates/pi-web-backend/src/{models,model_config,provider_usage,auth}*`.
- [files-and-access.md](docs/agents/files-and-access.md): the `/api/files` allow-list, worktrees and project grouping, file tree, uploads, previews, and web password throttling. Rust owns these backend operations; Next owns the browser UI and same-origin gateway adapters.
- [settings-ui.md](docs/agents/settings-ui.md): settings UI and controls; Rust owns plugin, skill and backend settings operations. UI: `components/SettingsUi.tsx`, `components/SkillsConfig.tsx`, `components/PluginsConfig.tsx`; backend: `pi-rust-ynl/crates/pi-web-backend/src/{plugins,skills}*`.
- [side-sessions.md](docs/agents/side-sessions.md): side-chat UI and behavior; Rust owns session forks, side-session runtime, storage and APIs. See `pi-rust-ynl/crates/pi-web-backend/src/session*` and the session UI components/hooks.
- [client-platform.md](docs/agents/client-platform.md): global shortcuts, mobile keyboard and viewport, terminal UI, completion sound and launcher. Terminal runtime is Rust-owned in `pi-rust-ynl/crates/pi-web-backend`; UI includes `components/TerminalPanel.tsx`, `components/TerminalExtraKeys.tsx`, `hooks/useTerminalTheme.ts`, keyboard CSS, and `bin/pi-web.js`.

---

## Old Safari (iOS 16.2)

- `/` renders entirely on the client, so one script chunk the browser cannot parse is a blank page. Next 16 targets Safari 16.4+; the `browserslist` in `package.json` lowers Safari and iOS to 16.2 so SWC turns class `static {}` blocks into private static fields. That covers Next's client runtime; other node_modules keep their syntax unless listed in `transpilePackages` (mermaid and `@mermaid-js/parser` are, for their lazy diagram chunks). Keep the other browserslist entries at Next's defaults.
- Never write a RegExp lookbehind (`(?<=`, `(?<!`) in client code: SWC cannot downlevel it and Safari parses it only from 16.4. `lib/markdown.ts` emulates its leading lookbehinds with `replaceNotPrecededBy()`. A lookbehind built at runtime (`new RegExp("(?<=鈥?")` in `try`) fails only when run; that is how `lib/gfm-autolink-email-loader.cjs` fixes `mdast-util-gfm-autolink-literal`'s email regex. The loader is registered for webpack and Turbopack in `next.config.ts` and fails the build if that regex changes upstream.

## Pi Session File Format

Location: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"...","cwd":"/path","parentSession":"/abs/path/to/parent.jsonl"}
{"type":"model_change","id":"<8hex>","parentId":null,"provider":"zenmux","modelId":"claude-sonnet-4-6","timestamp":"..."}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"user","content":"..."}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"assistant","content":[...],...}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"toolResult","toolCallId":"...","content":[...]}}
{"type":"compaction","id":"<8hex>","parentId":"<8hex>","summary":"...","firstKeptEntryId":"<8hex>","tokensBefore":N}
{"type":"session_info","id":"...","parentId":"...","name":"user-defined name"}
```

`SessionContext.entryIds[]` parallels `messages[]`: each displayed message's `.jsonl` entry id, used for fork and navigate_tree.

## CSS Variables (`app/globals.css`)

```
--bg --bg-panel --bg-hover --bg-selected --border
--text --text-muted --text-dim
--accent --user-bg --tool-bg
--font-mono
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
