# Subagents

Subagent execution belongs to the Rust agent plugin. Pi Web does not create a second session runtime, spawn child sessions through the Pi TypeScript SDK, or host its own subagent extension.

## Profiles and settings

The Agents settings UI edits profile and built-in enablement configuration through `app/api/subagents/profiles/**` and `app/api/subagents/settings/**`. These Next routes only forward requests; Rust owns the configuration reads, validation, profile discovery and file writes. The endpoints do not execute a subagent. Keep their file-format and scope behavior compatible with the Rust plugin, which consumes the same Pi agent configuration.

Profile fields include prompt, tools, model/thinking choice, skill and extension selection, MCP/codemode switches, concurrency/background options, and isolation preferences. Rust implements the profile and settings endpoints in `pi-web-backend`; UI rendering and shared response types remain in `components/AgentsConfig.tsx` and `lib/api-types.ts`.

## Runtime boundary

The Rust agent plugin owns tool registration, child execution, lifecycle/status and result delivery. The web client consumes the agent event/session APIs and renders returned subagent details. `components/MessageView.tsx` uses the shared `SubagentToolDetails` API shape to link a tool result to its session; it contains no execution logic.

Do not restore the removed `rpc-manager`, `subagent-runtime`, or built-in extension runtime in Pi Web. Changes to execution behavior belong in `pi-rust-ynl` and should preserve the existing profile configuration contract.

## Relevant files

- Rust plugin and agent/session APIs: `pi-rust-ynl`.
- Rust configuration APIs and profile storage: `pi-rust-ynl/crates/pi-web-backend/src/subagent_profiles.rs`, `subagent_settings.rs`.
- Web configuration UI and proxy routes: `app/api/subagents/**`, `components/AgentsConfig.tsx`, `lib/api-types.ts`.
- Display/client: `components/MessageView.tsx`, `components/AgentMiniStrip.tsx`, `components/SessionChatPanel.tsx`, `hooks/useAgentSession.ts`.
