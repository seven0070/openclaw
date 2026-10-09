# Jane local browser UI — development preview

This is a locally hosted **browser interface**, not yet a packaged desktop application or production-ready assistant.

## Prerequisites
- Node.js 22+
- Ollama installed and running on the same computer
- Qwen3-4B pulled with `ollama pull qwen3:4b`

## Start
From the root of the OpenClaw checkout:

```sh
node --test jane/*.test.mjs
node jane/web-server.mjs
```

Copy the **entire private URL** printed in the terminal into your browser. It includes a one-time token in the URL fragment. Keep that token private. The interface listens on `127.0.0.1:8787` by default.

To restrict file inspection to a chosen folder, set `JANE_WORKSPACE` to an absolute directory before starting. Without it, Jane uses the current working directory. The read-only gateway is not a hardened filesystem sandbox; avoid sensitive workspaces.

The local chat saves its conversation to `~/.jane/conversation.json`. Use **Forget chat** to clear it. The model can only request read-only workspace inspection through Jane's standalone tool gateway.

**Security:** This interface has no send/post/authenticate tools. It does not enforce identity approvals on native OpenClaw tools, and does not claim to. The local token is a basic defense against other browser pages, not strong OS-level authentication.

## Remaining product work
Native OpenClaw integration, secure approvals at every execution boundary, signed installers, automatic updates, voice, task scheduling, self-development, and full PC testing.
