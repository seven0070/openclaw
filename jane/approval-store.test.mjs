import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneApprovalStore, digestPayload } from "./approval-store.mjs";

test("approval is bound to action and exact outgoing payload and is single-use", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-approval-"));
  try {
    const store = new JaneApprovalStore({ directory: dir });
    const action = { id: "message-1", kind: "send_as_owner", payloadDigest: digestPayload("hello") };
    const id = await store.grant(action);
    const results = await Promise.all([store.consume(id, action), store.consume(id, action)]);
    assert.equal(results.filter(r => r.allowed).length, 1);
    assert.equal((await store.consume(id, action)).allowed, false);
    const other = await store.grant(action);
    assert.equal((await store.consume(other, { ...action, payloadDigest: digestPayload("changed") })).allowed, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("unapproved, expired and invalid actions cannot execute", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-approval-"));
  try {
    const store = new JaneApprovalStore({ directory: dir });
    const action = { id: "mail-1", kind: "send_as_owner", payloadDigest: digestPayload("payload") };
    assert.equal((await store.consume("00000000-0000-0000-0000-000000000000", action)).allowed, false);
    await assert.rejects(() => store.grant({ id: "a", kind: "read_text", payloadDigest: action.payloadDigest }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
