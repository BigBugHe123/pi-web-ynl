import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rustWorkspace = resolve(webDir, "..", "pi-rust-ynl");
const targetRoot = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(rustWorkspace, "target");
const profile = process.env.PI_WEB_BACKEND_PROFILE === "release" ? "release" : "debug";
const executableDir = join(targetRoot, profile);
const source = join(webDir, "out");
const destination = join(executableDir, "web");

if (!process.env.CARGO_TARGET_DIR && !destination.startsWith(join(rustWorkspace, "target", profile))) {
  throw new Error("Refusing to copy static assets outside the Rust target directory");
}

await mkdir(executableDir, { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
process.stdout.write(`Copied static frontend to ${destination}\n`);
