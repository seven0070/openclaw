import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneApprovalStore } from "./approval-store.mjs";
import { JaneIdentityExecutor } from "./identity-executor.mjs";

test("dispatch requires matching owner approval and consumes it once", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jane-executor-"));
  try {
    const store = new JaneApprovalStore({ directory });
    const calls = [];
    const executor = new JaneIdentityExecutor({ store, dispatch: async data => { calls.push(data); return "sent"; } });
    const action = executor.propose({ kind: "send_as_owner", target: "recipient@example.com", payload: "Hello" });
    await assert.rejects(() => executor.execute({ action, approvalId: "00000000-0000-0000-0000-000000000000", target: action.target, payload: "Hello" }), /denied/);
    assert.equal(calls.length, 0);
    const approvalId = await store.grant(action);
    await assert.rejects(() => executor.execute({ action, approvalId, target: action.target, payload: "Changed" }), /differs/);
    assert.equal(await executor.execute({ action, approvalId, target: action.target, payload: "Hello" }), "sent");
    await assert.rejects(() => executor.execute({ action, approvalId, target: action.target, payload: "Hello" }), /denied/);
    assert.equal(calls.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("target mismatch and unsupported actions never dispatch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jane-executor-"));
  try {
    let count = 0;
    const store = new JaneApprovalStore({ directory });
    const executor = new JaneIdentityExecutor({ store, dispatch: async () => { count++; } });
    assert.throws(() => executor.propose({ kind: "shell", target: "local", payload: "x" }));
    const action = executor.propose({ kind: "publish_as_owner", target: "account-A", payload: "Post" });
    const approvalId = await store.grant(action);
    await assert.rejects(() => executor.execute({ action, approvalId, target: "account-B", payload: "Post" }), /differs/);
    assert.equal(count, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
