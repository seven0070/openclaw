# Jane — your digital extension

Jane is a user-controlled AI extension built on the OpenClaw foundation. Initial target: local Qwen3-4B via Ollama on an 8 GB VRAM PC.

## Principles

- Jane is an extension of the owner, not a replacement for their identity.
- Identity-bearing actions require explicit, action-specific approval, with deny as the default.
- Never let agent-generated code or instructions change the approval policy.
- Log proposed and approved actions, redact secrets, and support revocation.
- Target 90% of routine digital work as a measurable aspiration, not a promised capability.
- Self-improvement means sandboxed proposals, tests, human review, and rollback, not unreviewed production self-modification.

## Current native capability

- Local Qwen3-4B model selection through the OpenClaw Ollama provider.
- A dedicated OpenClaw Jane agent, using the standard Control UI/desktop client
  for chat, settings, memory, tool activity, and authenticated approvals.
- SQLite-backed persistent task metadata through the optional `jane_tasks` tool.
- Native dashboard bindings for Jane task lists and redacted activity receipts;
  task mutations remain scoped to the Jane tool rather than a dashboard API.
- One-time approval at the native pre-execution boundary for every configured
  owner-sensitive tool. Approvals bind to the exact displayed canonical
  parameters; unsafe-to-display requests are denied.
- Controlled coding through OpenClaw's existing sandbox, tool policy, test, and
  VCS review/rollback workflow.

## Status

See [OPENCLAW-INTEGRATION.md](OPENCLAW-INTEGRATION.md) and the
[operations guide](OPERATIONS.md) for setup, security limits, recovery,
updates, and local-device verification.
