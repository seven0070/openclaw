/** Jane tool gateway: allowlisted, non-networking local tools with default-deny policy.
 * This is a standalone gateway, NOT yet integrated into OpenClaw's tool execution.
 */
import { randomUUID, createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { evaluateIdentityAction, requiresIdentityApproval } from "./identity-policy.mjs";

const MAX_OUTPUT = 20000;
const ALLOWED = new Set(["list_files", "read_text"]);
function inside(root, path) {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\") && !isAbsolute(rel));
}
export class JaneToolGateway {
  constructor({ workspace, audit = () => {} } = {}) {
    if (!workspace || !isAbsolute(workspace)) throw new TypeError("Absolute workspace required");
    this.workspace = resolve(workspace);
    this.audit = audit;
  }
  propose(kind, args = {}) {
    if (!ALLOWED.has(kind)) throw new Error("Tool not allowed");
    if (!args || typeof args !== "object" || Array.isArray(args) || typeof args.path !== "string")
      throw new TypeError("path required");
    if (args.path.includes("\0")) throw new Error("Invalid path");
    const target = resolve(this.workspace, args.path);
    if (!inside(this.workspace, target)) throw new Error("Path outside workspace");
    const action = { id: randomUUID(), kind, args: { path: args.path }, usesOwnerIdentity: false };
    action.payloadDigest = createHash("sha256").update(JSON.stringify({ kind, args: action.args })).digest("hex");
    return Object.freeze(action);
  }
  async execute(action, approval = null) {
    if (!action || !ALLOWED.has(action.kind) || typeof action.args?.path !== "string") throw new Error("Invalid action");
    // Recompute policy-relevant values, never trust action flags from model input.
    const expected = this.propose(action.kind, action.args);
    if (action.payloadDigest !== expected.payloadDigest) throw new Error("Action content changed");
    if (requiresIdentityApproval({ ...action, usesOwnerIdentity: true }) && action.usesOwnerIdentity === true) {
      // This gateway has no durable atomic approval consumption; deny identity actions even with approval.
      throw new Error("Identity-bearing actions not supported by this gateway");
    }
    const decision = evaluateIdentityAction({ ...action, usesOwnerIdentity: false }, approval);
    if (!decision.allowed) throw new Error(decision.reason);
    const target = resolve(this.workspace, action.args.path);
    if (!inside(this.workspace, target)) throw new Error("Path outside workspace");
    // Prevent symlink escapes: validate real paths after filesystem resolution.
    const { realpath } = await import("node:fs/promises");
    const rootReal = await realpath(this.workspace);
    const targetReal = await realpath(target);
    if (!inside(rootReal, targetReal)) throw new Error("Symlink outside workspace");
    let output;
    if (action.kind === "list_files") {
      output = (await readdir(targetReal)).slice(0, 200);
    } else {
      const { stat } = await import("node:fs/promises");
      const info = await stat(targetReal);
      if (!info.isFile() || info.size > MAX_OUTPUT) throw new Error("File too large or not a regular file");
      output = (await readFile(targetReal, "utf8")).slice(0, MAX_OUTPUT);
    }
    await this.audit({ actionId: action.id, kind: action.kind, path: action.args.path, status: "completed" });
    return output;
  }
}
