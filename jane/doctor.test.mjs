import test from "node:test";
import assert from "node:assert/strict";
import { diagnose } from "./doctor.mjs";

test("doctor identifies installed local Qwen and available OpenClaw CLI", async () => {
  const checks = await diagnose({
    fetchImpl: async () => ({ ok: true, json: async () => ({ models: [{ name: "qwen3:4b" }] }) }),
    run: () => ({ status: 0, stdout: "openclaw test-version" }),
  });
  assert.equal(checks.find(x => x.name === "Qwen3-4B installed").ok, true);
  assert.equal(checks.find(x => x.name === "OpenClaw CLI").ok, true);
});
test("doctor reports Ollama unavailable", async () => {
  const checks = await diagnose({ fetchImpl: async () => { throw new Error("offline"); },
    run: () => ({ status: 1 }) });
  assert.equal(checks.find(x => x.name === "Ollama reachable").ok, false);
});
