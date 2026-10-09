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
- Confirm audit logs contain no secrets.
- Review untrusted tool output, symlink races, and workspace sandboxing.

## Product

- Desktop chat, status, approvals, logs, settings, model selection.
- Installers and updates, restart recovery, onboarding, and diagnostics.
- Native voice mode, background tasks, and safe self-improvement proposals with human review.

A feature is only marked complete after its code, tests, and real-device verification are finished.
