# Jane local chat — first runnable milestone

This is a **standalone terminal prototype**, not yet an OpenClaw agent or desktop application. It talks to a local Ollama server running Qwen3-4B.

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

## Limitations and next steps
- Conversation history is in memory only and disappears when Jane exits.
- No tool execution, OpenClaw gateway integration, approval enforcement, or persistent memory yet.
- The Ollama endpoint is intentionally restricted to localhost to avoid accidentally sending private prompts to a remote server.
- Identity policy remains a separate scaffold; do not expose identity-bearing tools until approvals are enforced at execution time.
