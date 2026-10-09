import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneMemory } from "./memory.mjs";

test("conversation persists across restarts and can be cleared", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-memory-"));
  try {
    const file = join(dir, "state.json");
    const first = new JaneMemory({ file });
    await first.load();
    await first.appendTurn("Hello", "Hi!");
    const second = new JaneMemory({ file });
    assert.deepEqual(await second.load(), [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi!" }]);
    await second.clear();
    assert.deepEqual(await new JaneMemory({ file }).load(), []);
    assert.equal(JSON.parse(await readFile(file, "utf8")).version, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("rejects oversized messages", async () => {
  const memory = new JaneMemory();
  await assert.rejects(() => memory.appendTurn("x".repeat(12001), "Hi"), TypeError);
});
