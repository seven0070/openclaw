#!/usr/bin/env node
/** Opt-in lockdown of OpenClaw's native tool selection for Jane pilot.
 * This is restrictive configuration, not a complete identity authorization layer.
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export const LOCKDOWN = Object.freeze([
  ["tools.profile", "minimal"],
  ["tools.deny", JSON.stringify([
    "gateway", "group:runtime", "group:fs", "group:messaging",
    "group:ui", "group:nodes", "group:automation", "group:plugins",
    "group:sessions", "group:agents", "group:media",
    "github_publish", "github_identity_status",
  ])],
]);
export function commands() {
  return LOCKDOWN.map(([key, value]) => ["openclaw", ["config", "set", key, value]]);
}
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Command failed with status ${r.status}`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log("Jane pilot lockdown: restrict native OpenClaw tools to minimal profile and explicit denies.");
  console.log("WARNING: This changes global OpenClaw settings, potentially affecting your other agents.");
  console.log("Back up ~/.openclaw/openclaw.json and inspect current settings before continuing.");
  run("openclaw", ["config", "get", "tools"]);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const confirm = await rl.question("Type LOCKDOWN to apply these global restrictions: ");
    if (confirm !== "LOCKDOWN") {
      console.log("No changes made.");
    } else {
      for (const [cmd, args] of commands()) run(cmd, args);
      run("openclaw", ["config", "get", "tools"]);
      console.log("Review the effective policy and restart the gateway if required.");
    }
  } catch (error) {
    console.error("Lockdown failed: " + error.message);
    process.exitCode = 1;
  } finally { rl.close(); }
}
