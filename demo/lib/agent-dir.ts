import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve the global agent directory without depending on the Pi JavaScript SDK. */
export function getAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR;
  if (!configured) return join(homedir(), ".pi", "agent");

  let resolved = configured;
  if (resolved === "~") resolved = homedir();
  else if (resolved.startsWith("~/") || (process.platform === "win32" && resolved.startsWith("~\\"))) {
    resolved = join(homedir(), resolved.slice(2));
  }
  if (process.platform === "win32") {
    const wsl = resolved.match(/^\/(?:mnt\/|cygdrive\/)?([a-z])(?:\/(.*))?$/i);
    if (wsl) resolved = `${wsl[1].toUpperCase()}:\\${wsl[2]?.replaceAll("/", "\\") ?? ""}`;
  }
  if (resolved.startsWith("file://")) return fileURLToPath(resolved);
  return resolved;
}
