/** Approval-enforced execution boundary for a future trusted OpenClaw adapter.
 * NEVER expose the approval store or execute() callback directly to model-generated code.
 */
import { randomUUID } from "node:crypto";
import { digestPayload } from "./approval-store.mjs";
import { IDENTITY_ACTIONS } from "./identity-policy.mjs";

export class JaneIdentityExecutor {
  constructor({ store, dispatch, audit = async () => {} } = {}) {
    if (!store || typeof store.consume !== "function") throw new TypeError("Approval store required");
    if (typeof dispatch !== "function") throw new TypeError("Trusted dispatch callback required");
    this.store = store;
    this.dispatch = dispatch;
    this.audit = audit;
  }
  /** Construct a proposed action from the exact outgoing UTF-8 payload.
   * The trusted UI must show kind, target and payload to the owner before granting.
   */
  propose({ kind, target, payload }) {
    if (!IDENTITY_ACTIONS.includes(kind)) throw new Error("Unsupported identity action");
    if (typeof target !== "string" || !target.trim() || target.length > 2048) throw new Error("Invalid target");
    if (typeof payload !== "string" || payload.length > 100000) throw new Error("Invalid payload");
    return Object.freeze({
      id: randomUUID(), kind, target, payloadDigest: digestPayload(payload),
      usesOwnerIdentity: true,
    });
  }
  /** Consume before dispatch, fail closed; caller cannot override the proposed target.
   * The approval store must be private to a trusted UI; no model access to grant().
   */
  async execute({ action, approvalId, payload, target }) {
    if (!action || !IDENTITY_ACTIONS.includes(action.kind) ||
        typeof payload !== "string" || typeof target !== "string" ||
        target !== action.target || digestPayload(payload) !== action.payloadDigest) {
      throw new Error("Action or payload differs from proposal");
    }
    const decision = await this.store.consume(approvalId, action);
    if (!decision.allowed) {
      await this.audit({ actionId: action.id, kind: action.kind, outcome: "denied", reason: decision.reason });
      throw new Error("Identity action denied: " + decision.reason);
    }
    try {
      const result = await this.dispatch({ kind: action.kind, target, payload });
      await this.audit({ actionId: action.id, kind: action.kind, outcome: "dispatched" });
      return result;
    } catch (error) {
      await this.audit({ actionId: action.id, kind: action.kind, outcome: "failed" });
      throw error;
    }
  }
}
