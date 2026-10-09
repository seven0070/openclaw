import test from "node:test";
import assert from "node:assert/strict";
import { LOCKDOWN, commands } from "./lockdown-openclaw.mjs";
test("native OpenClaw pilot policy denies identity-bearing and mutating tool groups", () => {
  assert.deepEqual(LOCKDOWN[0], ["tools.profile", "minimal"]);
  const denied = JSON.parse(LOCKDOWN[1][1]);
  for (const item of ["gateway", "group:runtime", "group:fs", "group:messaging", "group:plugins", "group:ui"]) {
    assert.ok(denied.includes(item));
  }
  assert.ok(commands().every(([cmd, args]) => cmd === "openclaw" && args[0] === "config" && args[1] === "set"));
});
