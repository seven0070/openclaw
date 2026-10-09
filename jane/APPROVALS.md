# Jane durable identity approvals (library component)

This module implements single-use, short-lived approval records bound to an action ID and SHA-256 digest of the **exact outgoing payload string**. Each consumption atomically claims a record with a rename so concurrent callers cannot both use it. Failed validation consumes the record, too.

**Important:** This is not yet connected to OpenClaw's native tool execution. It must not be treated as protection for the native OpenClaw runtime. The approval-granting call is privileged: it must be exposed only to a trusted, authenticated owner UI, not to the language model, untrusted plugins, or arbitrary local processes.

The current implementation is a local prototype. It does not authenticate the approver, encrypt stored records, protect against malicious same-user filesystem tampering, or ensure that the final external send is transactionally tied to approval consumption. The actual execution adapter must recompute the digest from the exact payload about to be sent, check the action type, consume approval before executing, and audit the result. Do not enable identity-bearing native tools until this is integrated and reviewed.

Run: `node --test jane/*.test.mjs`
