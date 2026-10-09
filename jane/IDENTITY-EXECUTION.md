# Jane identity execution adapter — not wired to native OpenClaw

`JaneIdentityExecutor` is a reusable **trusted execution-boundary component**. A trusted application can propose an action with its target and exact outgoing payload; a separate authenticated owner UI must display the proposal and grant a short-lived, single-use approval via `JaneApprovalStore.grant()`. Only then can `execute()` consume approval and invoke the trusted dispatch callback.

## Security requirements before native integration
- The model must never access the store's `grant()` method, approval files, or the dispatch callback.
- Authenticate the owner and display exact recipient/target, action kind, and payload; approval is not inferred from conversation.
- Recompute payload and target at the final execution boundary, not merely when planning.
- Put this enforcement in **every** relevant native OpenClaw tool pathway, including plugins, browser and shell paths that can perform equivalent actions.
- Audit securely, handle dispatch retries without duplicating effects, and test revocation, expiration, concurrency, and process restarts.
- Do not enable identity-bearing native tools while the pilot lockdown is in place.

This module is not an authenticated approval UI, a native OpenClaw hook, or a guarantee that native OpenClaw cannot bypass the adapter. It is not yet safe for real external sends.
