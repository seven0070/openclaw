#!/usr/bin/env node
/** Interactive, opt-in configuration of the actual OpenClaw Ollama provider. */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const MODEL = "ollama/qwen3:4b";
function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} exited with code ${result.status}`);
}
export function plan() {
  return [
    ["ollama", ["list"]],
    ["openclaw", ["models", "list", "--provider", "ollama"]],
    ["openclaw", ["models", "set", MODEL]],
    ["openclaw", ["models", "list", "--provider", "ollama"]],
  ];
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log("Jane → OpenClaw native Ollama provider setup");
  console.log("Prerequisites: Ollama running, qwen3:4b pulled, OpenClaw installed/onboarded.");
  console.log("This will change OpenClaw's PRIMARY model to " + MODEL + ".");
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question("Type YES to change the primary model: ");
    if (answer !== "YES") {
      console.log("No changes made.");
      process.exitCode = 0;
    } else {
      for (const [cmd, args] of plan()) run(cmd, args);
      console.log("Primary model selected. Verify with openclaw dashboard and a live completion.");
    }
  } catch (error) {
    console.error("Setup failed: " + error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}
