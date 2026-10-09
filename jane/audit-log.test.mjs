import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneAuditLog } from "./audit-log.mjs";

test("audit logs redact outgoing payloads and recipients", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-audit-"));
  try {
    const file = join(dir, "audit.jsonl");
    const log = new JaneAuditLog({ file });
    await log.record({ actionId: "1", kind: "send_as_owner", outcome: "denied",
      target: "secret@example.com", payload: "private text", approvalId: "token" });
    const output = await readFile(file, "utf8");
    assert.equal(output.includes("secret@example.com"), false);
    assert.equal(output.includes("private text"), false);
    assert.equal(output.includes("token"), false);
    assert.equal(JSON.parse(output.trim()).outcome, "denied");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
