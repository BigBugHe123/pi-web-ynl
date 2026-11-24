import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Keep the staging tree on the project drive. Webpack resolves Next's pnpm
// symlinked client runtime relative to the app; Windows cross-drive paths
// cannot be made relative and become invalid module requests.
const stageDir = await mkdtemp(join(projectDir, ".static-build-"));
const appDir = join(projectDir, "app");

async function copySource(relativePath) {
  await cp(join(projectDir, relativePath), join(stageDir, relativePath), { recursive: true });
}

try {
  // Build from an isolated source tree: app/api and proxy.ts are server runtime
  // features and must not be part of a browser-only static export. This leaves
  // the normal Next build and any running dev server's .next directory alone.
  await cp(appDir, join(stageDir, "app"), {
    recursive: true,
    filter: (source) => {
      const relative = source.slice(appDir.length).replaceAll("\\", "/");
      return relative !== "/api" && !relative.startsWith("/api/")
        && relative !== "/manifest.webmanifest" && !relative.startsWith("/manifest.webmanifest/");
    },
  });
  for (const relativePath of [
    "components",
    "hooks",
    "lib",
    "public",
    "next.config.ts",
    "package.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
  ]) {
    await copySource(relativePath);
  }

  // Keep Next's local dependency installation available to the isolated tree
  // without copying or modifying node_modules.
  await symlink(join(projectDir, "node_modules"), join(stageDir, "node_modules"), "junction");

  const packageJsonPath = join(stageDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.scripts = { build: "next build --webpack" };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const appName = process.env.PI_WEB_APP_NAME?.trim() || "Pi Web";
  const manifest = {
    id: "/",
    name: appName,
    short_name: appName,
    description: "Local web interface for the pi coding agent",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    categories: ["developer", "productivity"],
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
  await writeFile(join(stageDir, "public", "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

  const nextBin = join(projectDir, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
    cwd: stageDir,
    stdio: "inherit",
    env: { ...process.env, PI_WEB_STATIC_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else {
    const outputDir = join(projectDir, "out");
    await rm(outputDir, { recursive: true, force: true });
    await cp(join(stageDir, "out"), outputDir, { recursive: true });
    process.stdout.write(`Static site written to ${outputDir}\n`);
  }
} finally {
  await rm(stageDir, { recursive: true, force: true });
}
