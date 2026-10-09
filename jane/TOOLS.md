# Jane safe tools — milestone 3

The standalone `JaneToolGateway` provides two read-only tools: `list_files` and `read_text`.
Both are limited to a configured absolute workspace and block basic traversal and symlink escapes.
No shell, browser, email, identity-bearing action, or file writes are enabled.

Example:
```js
import { JaneToolGateway } from "./tool-gateway.mjs";
const gateway = new JaneToolGateway({ workspace: "/absolute/path/to/workspace" });
const action = gateway.propose("list_files", { path: "." });
console.log(await gateway.execute(action));
```

Run tests with `node --test jane/*.test.mjs`.

**Security status:** This is a proof-of-concept and is not an OS sandbox. It does not protect against all race conditions or adversarial filesystem changes. Do not use it on sensitive workspaces or expose it to untrusted users. Identity-bearing operations are disabled, and no OpenClaw integration is claimed. Future integration must put approval checks at the actual execution boundary.
