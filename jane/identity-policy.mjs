/** Jane identity authorization policy: deny by default. Not yet wired into OpenClaw execution. */
export const IDENTITY_ACTIONS = Object.freeze([
  "send_as_owner", "publish_as_owner", "sign_as_owner",
  "authenticate_as_owner", "purchase_as_owner", "disclose_personal_data",
]);

/**
 * Approvals are single-use, action-specific, and bound to a canonical payload digest.
 * Callers must verify the digest against the exact outgoing action and atomically
 * consume the approval in durable storage before execution.
 */
export function requiresIdentityApproval(action) {
  return IDENTITY_ACTIONS.includes(action?.kind) || action?.usesOwnerIdentity === true;
}

export function evaluateIdentityAction(action, approval) {
  if (!action || typeof action !== "object") return { allowed: false, reason: "invalid_action" };
  if (!requiresIdentityApproval(action)) return { allowed: true, reason: "not_identity_bearing" };
  if (!approval || approval.granted !== true) return { allowed: false, reason: "approval_required" };
  if (approval.actionId !== action.id || !action.id) return { allowed: false, reason: "action_mismatch" };
  if (!action.payloadDigest || approval.payloadDigest !== action.payloadDigest) return { allowed: false, reason: "payload_mismatch" };
  if (approval.used === true) return { allowed: false, reason: "approval_consumed" };
  if (!Number.isFinite(approval.expiresAt) || Date.now() >= approval.expiresAt) return { allowed: false, reason: "approval_expired" };
  return { allowed: true, reason: "approval_valid_requires_atomic_consumption" };
}
