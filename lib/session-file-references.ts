import {
  isValidSessionId,
  isFilePathReferencedByEntries,
  isBashOutputPathReferencedByEntries,
} from "./session-file-references-core";

export { isFilePathReferencedByEntries } from "./session-file-references-core";

async function isPathReferenced(filePath: string, sessionId: string | null, kind: "file" | "bash"): Promise<boolean> {
  if (!isValidSessionId(sessionId)) return false;
  const backend = process.env.PI_RUST_BACKEND_URL
    ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
    ?? "http://127.0.0.1:3030";
  const url = new URL(`${backend.replace(/\/$/, "")}/api/v1/sessions/${encodeURIComponent(sessionId)}/file-reference`);
  url.searchParams.set("path", filePath);
  if (kind === "bash") url.searchParams.set("kind", kind);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2_000) });
    if (!response.ok) return false;
    const result = await response.json() as { referenced?: unknown };
    return result.referenced === true;
  } catch {
    return false;
  }
}

export function isFilePathReferencedBySession(filePath: string, sessionId: string | null): Promise<boolean> {
  return isPathReferenced(filePath, sessionId, "file");
}

export function isBashOutputPathReferencedBySession(filePath: string, sessionId: string | null): Promise<boolean> {
  return isPathReferenced(filePath, sessionId, "bash");
}

export { isBashOutputPathReferencedByEntries };
