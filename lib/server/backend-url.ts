import "server-only";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:3030";

/** Resolve the Rust service address for server-side Next routes and adapters. */
export function backendUrl(): string {
  return process.env.PI_RUST_BACKEND_URL
    ?? process.env.NEXT_PUBLIC_PI_RUST_BACKEND_URL
    ?? DEFAULT_BACKEND_URL;
}

