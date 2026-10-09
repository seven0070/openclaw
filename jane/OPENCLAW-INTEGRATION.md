# Jane → native OpenClaw integration (opt-in)

OpenClaw already supports the **native Ollama API**. Jane does not need to replace OpenClaw's gateway or add an incompatible OpenAI-compatible /v1 shim.

## On your own PC
1. Install Ollama, then `ollama pull qwen3:4b`.
2. Install/onboard OpenClaw following the repository's root README.
3. Run `node jane/setup-openclaw.mjs` and type `YES` only if you want to change OpenClaw's current primary model. This runs `openclaw models set ollama/qwen3:4b`.
4. Run `openclaw gateway status`, `openclaw models list --provider ollama`, and `openclaw dashboard`. Test a real completion.
5. If model discovery fails, follow `docs/providers/ollama/setup.md` and `docs/providers/ollama/configuration.md`; a model may need to be loaded and support tool use and sufficient context to qualify.

## Security
The native OpenClaw gateway has its own tools and permissions. **Jane's standalone identity-policy and read-only tool gateway do not constrain OpenClaw's native tools.** Do not enable email, purchases, authentication, social posting, or unrestricted shell/browser actions until an identity-approval enforcement layer has been integrated and verified at the native execution boundary. Use the native OpenClaw sandbox/tool policy for now.

## Verification status
This repository includes a configuration helper and unit test. It has not been executed on the owner's PC; the Ollama model's live behavior, GPU utilization, and OpenClaw agent compatibility are not yet verified.
