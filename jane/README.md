# Jane — your digital extension

Jane is a user-controlled AI extension built on the OpenClaw foundation. Initial target: local Qwen3-4B via Ollama on an 8 GB VRAM PC.

## Principles
- Jane is an extension of the owner, not a replacement for their identity.
- Identity-bearing actions require explicit, action-specific approval, with deny as the default.
- Never let agent-generated code or instructions change the approval policy.
- Log proposed and approved actions, redact secrets, and support revocation.
- Target 90% of routine digital work as a measurable aspiration, not a promised capability.
- Self-improvement means sandboxed proposals, tests, human review, and rollback, not unreviewed production self-modification.

## First milestone
1. Install Ollama and run `ollama pull qwen3:4b`.
2. Configure OpenClaw's Ollama provider using the local-only model. Verify actual model/tool compatibility before enabling autonomous tasks.
3. Integrate an approval gate into **all** identity-bearing execution paths (email, social posts, authentication, signatures, purchases, external disclosure). The policy module below is a starting point, not an enforcement integration.
4. Add persistent memory with opt-in retention and deletion, task queue, audit log, and evaluation suite.
5. Add a Jane-branded interface and controlled skills-development workflow.

## Status
Scaffolding only. No Jane runtime, enforced identity gateway, or working model integration is claimed yet.
