# Jane native OpenClaw extension

This extension makes Jane an OpenClaw agent profile rather than a separate tool
runner. It provides one optional `jane_tasks` tool backed by OpenClaw's
SQLite state store, and a native pre-execution policy for owner-sensitive
tools.

## What the approval policy guarantees

For the configured Jane agent only, every protected tool call reaches this
policy after the model selected the tool and immediately before OpenClaw invokes
the tool. The policy asks OpenClaw for an authenticated, one-time approval.
OpenClaw freezes the approved parameter snapshot while it waits, so a later hook
cannot swap the approved target or payload. The policy allows only `allow-once`
or `deny`; it never creates a standing grant.

The approval prompt shows the exact canonical JSON parameters and a SHA-256
digest. A call with a secret-bearing field, non-JSON value, excessive nesting,
or more than 260 bytes of canonical parameters is denied rather than truncated.
That deliberate limit means the owner can review exactly what will run. It is
not safe to replace it with a model-generated summary. Any tool that is neither
in `safeTools` nor `protectedTools` is denied, so a new plugin tool cannot
silently bypass the policy.

The owner identity is verified by the selected OpenClaw approval surface. Use a
paired Control UI/desktop client or a channel whose native plugin approval
handler has an explicit reviewer allowlist. Do not expose the Gateway publicly
or configure unauthenticated approval forwarding.

## Local setup

1. Install and start Ollama, then run `ollama pull qwen3:4b`.
2. Configure the provider and create a dedicated Jane agent. The agent should
   have its own workspace and the `ollama/qwen3:4b` model.
3. Enable the bundled plugin and add only `jane_tasks` to Jane's `tools.allow`.
   Protected native tools remain separately configured by normal OpenClaw tool
   policy; this plugin cannot make an unavailable tool available.
4. Configure `plugins.entries.jane.config.agentId` to the exact Jane agent ID.
   The default is `jane`. Set `protectedTools` to every native tool with an
   owner-sensitive side effect that this deployment exposes.
5. Configure a paired, authenticated approval surface for
   `approvals.plugin`, then start the Gateway and open the Control UI. Use the
   Jane agent's chat, Settings, Memory, task tool activity, and Approvals views.

The reference configuration in [`../../jane/OPENCLAW-INTEGRATION.md`](../../jane/OPENCLAW-INTEGRATION.md)
uses a sandboxed coding profile and defaults to one-time approvals.

## Tasks

`jane_tasks` supports `create`, `list`, `complete`, and `cancel`. Task records
are owned by the plugin's SQLite namespace and survive Gateway restarts. The
tool carries current-turn authority into its final write admission, so an ended
or replaced run cannot mutate tasks later.

The tool manages task metadata only. It cannot execute commands, browse,
message, schedule, or grant approvals.

## Coding and self-improvement

Use OpenClaw's sandboxed coding tools for any coding task. Create changes in a
dedicated sandbox/worktree, run the requested tests there, inspect the diff in a
review, and land only a reviewed commit. A failed test, missing sandbox, or
unreviewable change is a failed task, not permission to write to the host
workspace. Roll back with the normal VCS history; never ask Jane to mutate its
own approval policy or plugin files as part of an autonomous task.

See [`../../jane/OPENCLAW-INTEGRATION.md`](../../jane/OPENCLAW-INTEGRATION.md)
for the exact operational flow.
