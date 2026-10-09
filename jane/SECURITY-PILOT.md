# Jane: native OpenClaw pilot lockdown

**Current scope:** a cautious **chat-only** native OpenClaw pilot. This is not an identity approval implementation.

The existing `jane/identity-policy.mjs` does not run inside native OpenClaw. Instead, the opt-in `lockdown-openclaw.mjs` uses OpenClaw's documented `tools.profile` and `tools.deny` configuration to reduce exposed native tools.

## Usage
1. Back up your current `~/.openclaw/openclaw.json`. The helper modifies global OpenClaw settings and may affect other agents.
2. Review `jane/lockdown-openclaw.mjs` and `docs/gateway/config-tools/tool-policy.md`.
3. Run `node jane/lockdown-openclaw.mjs`; type `LOCKDOWN` to confirm.
4. Inspect `openclaw config get tools` and verify the effective tool catalog in the Control UI.
5. Keep external messaging channels and optional plugins disconnected until their authorization surfaces are reviewed.

The pilot intentionally disables shell, filesystem, messaging, browser/UI, nodes, sessions, plugins, and automation tool groups. It may disable more functionality than desired. The gateway/update tool is also denied.

**Not a complete security boundary:** channel-side behavior, direct API endpoints, session execution permissions, configuration changes by administrators, and plugin side effects need separate review. A future native execution hook must implement identity approval, durable one-time approval consumption, action-payload binding, audit, and denial tests before identity-bearing actions can be enabled.
