# Jane release gates

Jane is **not yet ready for a production release**. Do not claim it is equivalent to Hermes or a mature OpenClaw desktop agent.

## Automated

- Run `node --test jane/*.test.mjs` and `node --check` for every JavaScript module.
- Verify GitHub Actions test results, not merely the presence of a workflow.
- Test Ollama model requests and native OpenClaw completions on the owner's PC.
- Check identity denial and concurrency under process restarts.

## Security

- Configure an authenticated OpenClaw approval surface independently of the model.
- Verify the Jane protected-tool list covers every enabled owner-sensitive
  native tool, including plugin, browser, shell, messaging, and equivalent paths.
- Verify an approved call executes only after a one-time approval over the exact
  canonical parameter payload, and that secret-bearing or oversized payloads deny.
- Verify an ordinary hook cannot alter a trusted-policy-approved tool payload;
  the call must be vetoed rather than executed with changed parameters.
- Verify Jane cannot use coding tools to edit `extensions/jane` or the active
  OpenClaw configuration.
- Confirm audit logs contain no secrets.
- Review untrusted tool output, symlink races, and workspace sandboxing.

## Product

- Desktop chat, status, approvals, logs, settings, model selection.
- Jane dashboard bindings for task and audit-history reads; task mutation remains
  on the scoped Jane tool and native approvals remain on the host surface.
- Installers and updates, restart recovery, onboarding, and diagnostics.
- Native voice mode, background tasks, and safe self-improvement proposals with human review.

## Hardware/device evidence (manual)

- Record the GPU, VRAM, operating system, Ollama version, and Qwen3-4B
  quantization used for a real completion.
- Record the paired approval client and test allow-once, deny, timeout,
  cancellation, and Gateway restart behavior.
- Test microphone/speaker or platform Talk using the selected speech provider;
  Qwen3-4B alone provides no speech recognition or synthesis.
- Test desktop/mobile Control UI rendering for chat, settings, memory, task
  tool activity, and pending approvals on each supported device.

A feature is only marked complete after its code, tests, and real-device verification are finished.
