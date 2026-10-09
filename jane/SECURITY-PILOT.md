# Jane: native OpenClaw pilot lockdown

**Current scope:** a cautious native OpenClaw pilot. The bundled Jane plugin
adds a one-time approval hook at configured native tool execution boundaries.

The legacy `jane/identity-policy.mjs` remains a standalone prototype. Native
protection is provided by `extensions/jane`, which uses OpenClaw's authenticated
plugin-approval flow after tool selection and before execution. The opt-in
`lockdown-openclaw.mjs` remains useful to reduce exposed native tools.

## Usage

1. Back up your current `~/.openclaw/openclaw.json`. The helper modifies global OpenClaw settings and may affect other agents.
2. Review `jane/lockdown-openclaw.mjs` and `docs/gateway/config-tools/tool-policy.md`.
3. Run `node jane/lockdown-openclaw.mjs`; type `LOCKDOWN` to confirm.
4. Inspect `openclaw config get tools` and verify the effective tool catalog in the Control UI.
5. Keep external messaging channels and optional plugins disconnected until their authorization surfaces are reviewed.

The pilot intentionally disables shell, filesystem, messaging, browser/UI, nodes, sessions, plugins, and automation tool groups. It may disable more functionality than desired. The gateway/update tool is also denied.

**Not a complete security boundary:** The protected tool list is deployment
configuration, so it must include every owner-sensitive tool that is enabled.
Channel-side behavior, direct API endpoints, session execution permissions, and
administrator configuration changes still need separate review. Keep OpenClaw's
sandbox, tool-policy, and exec-approval controls enabled. The Jane policy is
deliberately fail-closed for secrets and payloads too long to display exactly.
