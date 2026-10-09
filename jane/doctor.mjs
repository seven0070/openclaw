#!/usr/bin/env node
/** Jane local preflight diagnostics. No config mutations. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { JaneOllamaClient } from "./ollama-client.mjs";

export async function diagnose({ fetchImpl = globalThis.fetch, run = spawnSync, workspace = process.cwd() } = {}) {
  const checks = [];
  checks.push({ name: "Node.js 22+", ok: Number(process.versions.node.split(".")[0]) >= 22, detail: process.version });
  try {
    await access(resolve(workspace));
    checks.push({ name: "Workspace exists", ok: true, detail: resolve(workspace) });
  } catch { checks.push({ name: "Workspace exists", ok: false, detail: resolve(workspace) }); }
  try {
    const r = await fetchImpl("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    const found = Array.isArray(data.models) && data.models.some(m => m.name === "qwen3:4b" || m.name?.startsWith("qwen3:4b-"));
    checks.push({ name: "Ollama reachable", ok: true });
    checks.push({ name: "Qwen3-4B installed", ok: found, detail: found ? "Found" : "Run ollama pull qwen3:4b" });
  } catch (error) {
    checks.push({ name: "Ollama reachable", ok: false, detail: error.message });
    checks.push({ name: "Qwen3-4B installed", ok: false, detail: "Cannot inspect Ollama" });
  }
  const result = run("openclaw", ["--version"], { encoding: "utf8", timeout: 5000, shell: false });
  checks.push({ name: "OpenClaw CLI", ok: !result.error && result.status === 0,
    detail: result.error ? result.error.message : (result.stdout || "").trim().slice(0, 120) });
  return checks;
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const checks = await diagnose();
  for (const check of checks) console.log((check.ok ? "PASS" : "FAIL") + " " + check.name + (check.detail ? ": " + check.detail : ""));
  if (checks.some(x => !x.ok)) process.exitCode = 1;
}
