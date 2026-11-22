# Files, paths and worktrees

## Ownership

Rust is the source of truth for path authorization and filesystem/Git operations. The main modules are `path_access.rs`, `cwd.rs`, `workspace_files.rs`, `file_index.rs`, `git_changes.rs`, `worktrees.rs`, and `bash_output.rs` in `pi-rust-ynl/crates/pi-web-backend/src`.

Next routes preserve the same-origin API and stream Rust responses. They must not cache allowed roots, register temporary roots, resolve filesystem paths for authorization, or read/write workspace files. `agent/new` creates the session in Rust; the resulting session cwd participates in Rust's allowed-root calculation.

## Path authorization

- Rust canonicalizes a requested path before authorization and checks it against roots derived from active session cwds, project roots, `PI_WEB_ALLOWED_ROOTS`, and the agent/global skill roots where relevant.
- Never accept an allowed-root list from the browser. Rust derives roots from its own session/config state.
- Existing file and directory operations require a canonical path inside an allowed root. Uploads and future paths must resolve through an authorized existing ancestor. Symlinks and junctions are checked by their resolved target.
- `/api/cwd/validate` canonicalizes and registers a valid cwd in Rust. `/api/cwd/browse` and `/api/home` also run in Rust.
- File watch uses polling SSE from Rust. The Next handler only forwards the response stream.

## Files and previews

`/api/files/<path>` supports directory listing, text/media reads, metadata, download and Range requests, uploads/conflict checks, link approval, and watch SSE. Keep request/body limits and the Rust authorization check when extending these operations.

DOCX preview is generated in Rust from OOXML. It supports paragraphs, headings, basic text formatting, links, common ordered/unordered lists, tables and embedded images. Complex Word styles and some numbering/layout constructs can still differ from Mammoth.

## Git and worktrees

Git status/diff, file indexing and worktree operations are Rust APIs. File indexing uses Git's file list where available and falls back to a bounded directory walk. Worktree cwd fallback is resolved and reauthorized in Rust; do not add a Node `child_process` Git implementation.

The browser may cache UI presentation state such as expanded folders and selected worktrees. It must not treat that state as authorization or server filesystem state.

## Desktop file manager

`open-in-explorer` runs on the Rust host. The Next adapter disables it when the configured Rust URL appears remote. `PI_RUST_BACKEND_SAME_HOST=1` is an explicit deployment assertion and should only be used when Rust can open the desktop on the browser's computer.
