# Jane local chat

The terminal and local-browser entry points are useful for local Qwen3-4B chat.
For persistent tasks, authenticated approvals, activity, settings, and memory
management, use Jane through OpenClaw as described in
[OPENCLAW-INTEGRATION.md](OPENCLAW-INTEGRATION.md).

## Requirements

- Node.js 20+ (OpenClaw itself may require a newer Node.js version)
- Ollama installed and running locally
- An 8 GB VRAM GPU is the intended target; memory use varies with quantization and context size

## Run

```sh
ollama pull qwen3:4b
node jane/chat.mjs
```

Type `/exit` to stop. If Ollama is not running, start it with `ollama serve` (unless the installed app already starts the service).

## Test

```sh
node --test jane/*.test.mjs
```

## Limits

- The standalone chat stores local conversation history in `~/.jane`; it does
  not share that history with the OpenClaw Jane agent.
- The standalone read-only tool gateway is not an OS sandbox and cannot use
  native OpenClaw approvals. Use the native agent for any tool with side effects.
- The Ollama endpoint is intentionally restricted to localhost to avoid accidentally sending private prompts to a remote server.
- Qwen3-4B is text-only. Voice requires a separately configured local speech
  provider or supported device flow.
