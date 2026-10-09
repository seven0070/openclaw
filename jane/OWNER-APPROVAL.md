# Jane owner approval — local terminal prototype

Run `node jane/approval-demo.mjs` from a trusted local terminal. The demo displays the exact destination and payload and requires typing a one-time, action-specific approval phrase. It **never sends a real message**.

The `reviewAndDispatch` library composes the existing identity executor with the durable approval store. A trusted caller supplies the owner prompt and dispatch callback; neither should be exposed to model-generated code.

**Security limitations:** Terminal access is not equivalent to strong authentication. This is not a desktop approval UI or a native OpenClaw tool hook. Do not use it for real identity-bearing actions yet. Production integration requires authenticated owner sessions, revocation, hardened storage, full auditing, and enforcement across all native tool pathways. The OpenClaw pilot lockdown should remain enabled.
