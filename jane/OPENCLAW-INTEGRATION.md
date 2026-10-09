# Jane → native OpenClaw integration

Jane uses OpenClaw's native Ollama provider and agent runtime. It does not add an
OpenAI-compatible proxy or a second runtime. The bundled `extensions/jane`
plugin provides persistent tasks and a native pre-execution owner-approval policy.

## On your own PC

1. Install Ollama, then run `ollama pull qwen3:4b`.
2. Install and onboard OpenClaw following the repository root README.
3. Run `node jane/setup-openclaw.mjs` and type `YES` if you want to select
   `ollama/qwen3:4b` as the current primary model.
4. Create a dedicated agent and workspace, for example:

   ```sh
   openclaw agents add jane --workspace ~/.openclaw/workspace-jane --model ollama/qwen3:4b --non-interactive
   ```

5. Enable the Jane plugin in your OpenClaw configuration, set
   `plugins.entries.jane.config.agentId` to `jane`, and allow the optional
   `jane_tasks` tool for that agent. Keep all external-action tools disabled
   until their owner-approval routing is configured.
6. Configure `approvals.plugin` to use a paired and authenticated Control UI,
   desktop client, or channel-native reviewer allowlist. Do not use a generic
   unauthenticated target as an approval surface.
7. Start the Gateway and open `openclaw dashboard`. Select Jane for chat,
   Settings, Memory, task/tool activity, and approval review.

## Approval boundary

`extensions/jane` registers a bundled trusted tool policy, which runs before
ordinary tool hooks and before native execution, including Codex native
`PreToolUse` calls. It asks OpenClaw for one-time authenticated approval over
the exact canonical parameter payload. While approval is pending, OpenClaw
freezes the parameter snapshot; if a later ordinary hook attempts to change it
after trusted consent, the runtime vetoes the tool call.
Only `allow-once` or `deny` is offered. Secret-bearing, malformed, deeply
nested, or too-large parameter sets are denied instead of being truncated.

The default protected list is `message`, `browser`, `exec`, `apply_patch`,
`write`, `cron`, `gateway`, `computer`, `nodes`, and `sessions`. Only `read`
and `jane_tasks` are safe by default; every other tool is denied until it is
explicitly classified as protected or safe. The built-in sensitive list cannot
be downgraded to safe by configuration. Plugin approvals do not replace
OpenClaw's own sandbox, exec approval, channel access, or tool-allow policies;
those must remain enabled.

## Voice, tasks, and coding

The Control UI/desktop clients provide chat, settings, memory, tool activity,
and native approval surfaces. Use a supported local speech provider or the
platform microphone flow for voice; Qwen3-4B itself is text-only. Jane's task
tool persists task metadata through OpenClaw SQLite and survives restart.

For autonomous coding, use a dedicated Jane workspace with OpenClaw sandboxing
enabled. Require one-time approval for `exec` and `apply_patch`, run tests in
the sandbox, review the diff, and commit only after review. Recovery is the
normal OpenClaw service recovery plus VCS rollback to the last reviewed commit.
Jane blocks tool calls that attempt to edit its own extension or OpenClaw
configuration; make those changes outside Jane's autonomous runtime.

## Verification status

The native plugin has focused approval and SQLite-task tests. It is not a claim
that this cloud runner has a local Ollama daemon, GPU, microphone, a paired
owner device, or a supported desktop OS. Complete the live local checks in
`jane/RELEASE-CHECKLIST.md` before relying on external actions.

For installation, startup, recovery, update, and hardware-test procedures, see
[OPERATIONS.md](OPERATIONS.md).
