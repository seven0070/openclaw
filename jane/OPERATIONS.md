# Jane operations guide

Jane is an OpenClaw agent configuration plus the bundled `extensions/jane`
plugin. The supported product surface is OpenClaw's authenticated Control UI
and desktop/mobile clients; the small `jane/web-server.mjs` page is a
local-only development preview, not an approval surface.

## Install and start

1. On the owner's computer, install Ollama and fetch the intended local model:

   ```sh
   ollama pull qwen3:4b
   ```

2. Install and onboard OpenClaw using its root documentation. Run a non-mutating
   readiness check before changing settings:

   ```sh
   node jane/doctor.mjs
   ```

3. Run `node jane/setup-openclaw.mjs`, and confirm only after it displays the
   model change. Create a dedicated Jane agent and workspace:

   ```sh
   openclaw agents add jane --workspace ~/.openclaw/workspace-jane --model ollama/qwen3:4b --non-interactive
   ```

4. Enable bundled plugin `jane`, set `plugins.entries.jane.config.agentId` to
   `jane`, and add `jane_tasks` to that agent's tools. Pair an authenticated
   Control UI, desktop, or supported device approval client before enabling any
   sensitive tool.

5. Start the Gateway, open the Control UI, choose the Jane agent, and make a
   read-only task call before allowing an external action. Task data uses the
   host SQLite state store and survives Gateway restart.

The plugin permits only `read` and `jane_tasks` without a review. Its trusted
policy blocks unknown tools, applies before ordinary tool hooks (including
native Codex tools), and requires a fresh `allow-once` decision for every
sensitive call. It refuses attempts by Jane to modify its own policy or the
OpenClaw configuration.

## Owner approvals and controlled coding

Use a dedicated workspace and keep OpenClaw's sandbox, tool allowlist, and
native execution approval mechanisms enabled. Jane's owner approval is
additional to—not a replacement for—those controls.

For a coding task:

1. Put the target repository in Jane's dedicated workspace and select the
   sandboxed execution profile.
2. Keep `exec`, `apply_patch`, and `write` in Jane's protected-tools list.
3. Review each exact payload and approve only the intended action once.
4. Require the task to run its tests, inspect `git diff`, and present the
   result. Commit only after the owner reviews the diff.
5. Roll back a reviewed commit with normal VCS procedures (for example,
   `git revert <reviewed-commit>`), not by asking Jane to rewrite its policy.

An approval does not authorize a later hook to replace its reviewed parameters:
the native runtime vetoes such a call. Jane also cannot autonomously alter
`extensions/jane` or `openclaw.json`. These controls deliberately do not grant
permission to run arbitrary self-modification.

## Recovery and updates

Before any repair or update, keep a copy of the active OpenClaw configuration
and record the last reviewed repository commit. Then use this sequence:

1. Run `openclaw gateway status --deep` and `node jane/doctor.mjs`.
2. If the Gateway is managed, stop it with the service command shown by
   OpenClaw. If it was launched manually, stop that exact process yourself.
3. Run the OpenClaw version's documented `openclaw doctor` repair/update flow.
   Read its proposed changes before accepting a `--fix` or update action.
4. Restart the Gateway, re-run `openclaw gateway status --deep`, and verify a
   read-only Jane task before re-enabling sensitive tools.
5. Re-run the approval regression checks below after an OpenClaw upgrade.

Do not delete state, approvals, or task databases to "repair" Jane. If runtime
artifact publication says the Gateway status cannot be verified, stop or
identify the Gateway first; that fail-closed condition is intentional.

## Verification

In this checkout, run:

```sh
node --test jane/*.test.mjs
pnpm test extensions/jane/index.test.ts extensions/jane/src/approval-policy.test.ts extensions/jane/src/tasks.test.ts --maxWorkers=1
pnpm exec vitest run --config test/vitest/vitest.infra.config.ts src/agents/agent-tools.before-tool-call.embedded-mode.test.ts --maxWorkers=1
```

Hardware and owner-device checks are separate from these automated tests:

- local Ollama/Qwen completion on the intended GPU;
- paired authenticated approval, allow-once, deny, timeout, and restart;
- microphone/speaker or platform Talk flow with the selected local speech
  provider (Qwen3-4B is text-only);
- desktop/mobile Control UI task, memory, tool-activity, and approval views;
- sandbox escape, symlink, and untrusted-tool-output tests on the target OS.

Record the device, OS, model quantization, OpenClaw version, and results in the
release evidence before enabling identity-bearing workflows.
