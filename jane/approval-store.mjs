/** Durable, single-use identity approval records for Jane's future execution boundary.
 * Approval grants must originate from trusted owner UI, NEVER from model output.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { evaluateIdentityAction, requiresIdentityApproval } from "./identity-policy.mjs";

export function digestPayload(payload) {
  if (typeof payload !== "string") throw new TypeError("Payload must be exact outgoing string");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
export class JaneApprovalStore {
  constructor({ directory } = {}) {
    if (!directory) throw new TypeError("Approval directory required");
    this.directory = resolve(directory);
  }
  path(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid approval id");
    return join(this.directory, id + ".json");
  }
  async grant(action, { ttlMs = 60000 } = {}) {
    if (!requiresIdentityApproval(action)) throw new Error("Only identity actions require approval");
    if (!action || typeof action.id !== "string" || !action.id ||
      typeof action.payloadDigest !== "string" || !/^[a-f0-9]{64}$/.test(action.payloadDigest) ||
      typeof action.target !== "string" || !action.target.trim() ||
      !["send_as_owner", "publish_as_owner", "sign_as_owner", "authenticate_as_owner", "purchase_as_owner", "disclose_personal_data"].includes(action.kind) ||
      !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 300000) {
      throw new Error("Invalid approval request");
    }
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const id = randomUUID();
    const record = { granted: true, actionId: action.id, kind: action.kind, target: action.target, payloadDigest: action.payloadDigest, expiresAt: Date.now() + ttlMs, used: false };
    await writeFile(this.path(id), JSON.stringify(record), { flag: "wx", mode: 0o600 });
    return id;
  }
  /** Claim with atomic rename to a unique consumed filename; exactly one caller can win.
   * Rename does not prevent malicious local actors from tampering with the directory.
   */
  async consume(id, action) {
    const path = this.path(id);
    const claimed = path + ".consumed." + randomUUID();
    try { await rename(path, claimed); }
    catch (error) {
      if (error.code === "ENOENT") return { allowed: false, reason: "approval_missing_or_used" };
      throw error;
    }
    try {
      const record = JSON.parse(await readFile(claimed, "utf8"));
      if (record.kind !== action?.kind || record.target !== action?.target) return { allowed: false, reason: "action_details_mismatch" };
      return evaluateIdentityAction(action, record);
    } finally {
      await unlink(claimed).catch(() => {});
    }
  }
}
