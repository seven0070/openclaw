/** Interactive owner review on a trusted local terminal.
 * No model-controlled approval and no web endpoint.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { JaneIdentityExecutor } from "./identity-executor.mjs";

export async function reviewAndDispatch({ executor, store, kind, target, payload, ask, ttlMs = 60000 }) {
  if (!(executor instanceof JaneIdentityExecutor)) throw new TypeError("Trusted executor required");
  if (!store || typeof store.grant !== "function") throw new TypeError("Trusted store required");
  if (typeof ask !== "function") throw new TypeError("Trusted owner prompt required");
  const action = executor.propose({ kind, target, payload });
  // The prompt MUST render the exact payload, not a model-generated summary.
  const decision = await ask({
    id: action.id, kind: action.kind, target: action.target,
    payload, digest: action.payloadDigest,
  });
  if (decision !== "APPROVE " + action.id) return { approved: false, reason: "owner_declined" };
  const approvalId = await store.grant(action, { ttlMs });
  const result = await executor.execute({ action, approvalId, target, payload });
  return { approved: true, result };
}

export async function terminalOwnerPrompt(proposal) {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error("Interactive local TTY required");
  stdout.write("\nJane requests an identity-bearing action:\n");
  stdout.write("Action: " + proposal.kind + "\nTarget: " + proposal.target + "\n");
  stdout.write("Exact payload:\n----- BEGIN -----\n" + proposal.payload + "\n----- END -----\n");
  stdout.write("SHA-256: " + proposal.digest + "\n");
  stdout.write("Approve only if YOU requested this exact action and recipient.\n");
  const rl = createInterface({ input: stdin, output: stdout });
  try { return await rl.question("Type APPROVE " + proposal.id + " to authorize, or press Enter to deny: "); }
  finally { rl.close(); }
}
