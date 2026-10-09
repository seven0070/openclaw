import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneApprovalStore } from "./approval-store.mjs";
import { JaneIdentityExecutor } from "./identity-executor.mjs";
import { reviewAndDispatch } from "./owner-approval.mjs";

test("owner must explicitly approve exact action; decline never dispatches", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jane-review-"));
  try {
    const store = new JaneApprovalStore({ directory });
    const calls = [];
    const executor = new JaneIdentityExecutor({ store, dispatch: async input => { calls.push(input); return "demo"; } });
    const params = { executor, store, kind: "send_as_owner", target: "owner-approved@example.com", payload: "Hello" };
    const denied = await reviewAndDispatch({ ...params, ask: async () => "yes" });
    assert.equal(denied.approved, false);
    assert.equal(calls.length, 0);
    const allowed = await reviewAndDispatch({ ...params, ask: async p => "APPROVE " + p.id });
    assert.deepEqual(allowed, { approved: true, result: "demo" });
    assert.deepEqual(calls, [{ kind: "send_as_owner", target: params.target, payload: "Hello" }]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("untrusted input cannot replace approval decision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jane-review-"));
  try {
    const store = new JaneApprovalStore({ directory });
    const executor = new JaneIdentityExecutor({ store, dispatch: async () => { throw Error("should not dispatch"); } });
    const result = await reviewAndDispatch({
      executor, store, kind: "publish_as_owner", target: "profile", payload: "content",
      ask: async p => "APPROVE " + p.id + " extra",
    });
    assert.equal(result.approved, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
