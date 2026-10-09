import test from "node:test";
import assert from "node:assert/strict";
import { plan } from "./setup-openclaw.mjs";
test("native OpenClaw setup selects local Qwen3-4B without a shell", () => {
  const steps = plan();
  assert.deepEqual(steps[2], ["openclaw", ["models", "set", "ollama/qwen3:4b"]]);
  assert.ok(steps.every(([cmd, args]) => ["openclaw", "ollama"].includes(cmd) && Array.isArray(args)));
});
