#!/usr/bin/env node
/** Local owner approval demonstration. No external side effects. */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneApprovalStore } from "./approval-store.mjs";
import { JaneIdentityExecutor } from "./identity-executor.mjs";
import { reviewAndDispatch, terminalOwnerPrompt } from "./owner-approval.mjs";

const store = new JaneApprovalStore({ directory: join(tmpdir(), "jane-approval-demo-" + process.pid) });
const executor = new JaneIdentityExecutor({
  store,
  dispatch: async action => {
    console.log("DEMO ONLY: would dispatch " + action.kind + " to " + action.target);
    return "No message was sent.";
  },
});
try {
  const result = await reviewAndDispatch({
    executor, store, kind: "send_as_owner", target: "demo@example.invalid",
    payload: "This is only a Jane approval demonstration.",
    ask: terminalOwnerPrompt,
  });
  console.log(result.approved ? result.result : "Owner declined. Nothing dispatched.");
} catch (error) {
  console.error("Demo failed: " + error.message);
  process.exitCode = 1;
}
