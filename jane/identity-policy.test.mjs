import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIdentityAction } from "./identity-policy.mjs";

const action = { id: "a1", kind: "send_as_owner", payloadDigest: "digest1" };
test("identity action denied without approval", () => {
  assert.equal(evaluateIdentityAction(action, null).allowed, false);
});
test("mismatched content denied", () => {
  assert.equal(evaluateIdentityAction(action, { granted: true, actionId: "a1", payloadDigest: "other", expiresAt: Date.now() + 60000 }).allowed, false);
});
test("matching approval only passes policy precheck", () => {
  assert.equal(evaluateIdentityAction(action, { granted: true, actionId: "a1", payloadDigest: "digest1", expiresAt: Date.now() + 60000 }).allowed, true);
});
