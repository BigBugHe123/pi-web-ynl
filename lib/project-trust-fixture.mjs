import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Write the same path-to-boolean trust map consumed by the Rust backend. */
export function setProjectTrustFixture(agentDir, cwd, decision) {
  const path = join(agentDir, "trust.json");
  let trust = {};
  try {
    trust = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const canonical = realpathSync(cwd);
  if (decision === null) delete trust[canonical];
  else trust[canonical] = decision;
  writeFileSync(path, `${JSON.stringify(trust, null, 2)}\n`);
}

export class ProjectTrustStoreFixture {
  constructor(agentDir) { this.agentDir = agentDir; }
  set(cwd, decision) { setProjectTrustFixture(this.agentDir, cwd, decision); }
}
