import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneToolGateway } from "./tool-gateway.mjs";

test("read-only workspace tools work and reject traversal and mutation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-gateway-"));
  try {
    await writeFile(join(dir, "note.txt"), "Jane test");
    const events = [];
    const gateway = new JaneToolGateway({ workspace: dir, audit: event => events.push(event) });
    assert.equal(await gateway.execute(gateway.propose("read_text", { path: "note.txt" })), "Jane test");
    assert.deepEqual(await gateway.execute(gateway.propose("list_files", { path: "." })), ["note.txt"]);
    assert.equal(events.length, 2);
    assert.throws(() => gateway.propose("read_text", { path: "../outside" }));
    assert.throws(() => gateway.propose("shell", { path: "." }));
    await assert.rejects(() => gateway.execute({ kind: "read_text", args: { path: "note.txt" }, usesOwnerIdentity: true }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("symlink escaping workspace is blocked", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-gateway-"));
  try {
    await symlink(tmpdir(), join(dir, "escape"), "dir");
    const gateway = new JaneToolGateway({ workspace: dir });
    await assert.rejects(() => gateway.execute(gateway.propose("list_files", { path: "escape" })), /Symlink outside workspace/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
