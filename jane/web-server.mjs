/** Jane local-only browser UI. No external network listeners or identity tools. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { JaneOllamaClient } from "./ollama-client.mjs";
import { JaneAgent } from "./agent.mjs";
import { JaneToolGateway } from "./tool-gateway.mjs";
import { JaneMemory } from "./memory.mjs";
import { resolve } from "node:path";

const MAX_BODY = 16000;
const HTML = new URL("./web-ui.html", import.meta.url);
function safeEqual(a, b) {
  const x = Buffer.from(a || ""), y = Buffer.from(b || "");
  return x.length === y.length && timingSafeEqual(x, y);
}
function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(value));
}
export function createJaneWebServer({ agent, memory, token = randomBytes(32).toString("hex") }) {
  if (!agent || !memory) throw new TypeError("Agent and memory required");
  let busy = false;
  const server = createServer(async (req, res) => {
    const host = req.headers.host || "";
    const match = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(host);
    if (!match) return json(res, 403, { error: "Invalid host" });
    const origin = req.headers.origin;
    if (origin && origin !== "http://" + host) return json(res, 403, { error: "Invalid origin" });
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("content-security-policy", "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    const path = req.url?.split("?")[0];
    if (req.method === "GET" && path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(await readFile(HTML));
    }
    if (!safeEqual(req.headers["x-jane-token"], token)) return json(res, 401, { error: "Unauthorized" });
    if (req.method === "GET" && path === "/api/history") return json(res, 200, { messages: memory.messages });
    if (req.method !== "POST" || !["/api/chat", "/api/forget"].includes(path)) return json(res, 404, { error: "Not found" });
    if (busy) return json(res, 409, { error: "Another operation is in progress" });
    busy = true;
    try {
      if (path === "/api/forget") {
        await memory.clear();
        return json(res, 200, { ok: true });
      }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > MAX_BODY) return json(res, 413, { error: "Message too large" });
      }
      let parsed;
      try { parsed = JSON.parse(body); } catch { return json(res, 400, { error: "Invalid JSON" }); }
      const prompt = parsed?.prompt;
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000)
        return json(res, 400, { error: "Invalid prompt" });
      const answer = await agent.respond(memory.messages, prompt);
      await memory.appendTurn(prompt, answer);
      return json(res, 200, { answer });
    } catch (error) {
      console.error("Jane web error:", error.message);
      return json(res, 500, { error: "Jane operation failed" });
    } finally { busy = false; }
  });
  return { server, token };
}
export async function startJaneWeb({ workspace = process.cwd(), port = 8787 } = {}) {
  const memory = new JaneMemory();
  await memory.load();
  const agent = new JaneAgent({
    client: new JaneOllamaClient(),
    gateway: new JaneToolGateway({ workspace: resolve(workspace) }),
  });
  const { server, token } = createJaneWebServer({ agent, memory });
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(port, "127.0.0.1", ok); });
  const address = server.address();
  console.log("Jane local UI: http://127.0.0.1:" + address.port + "/#token=" + token);
  console.log("Keep this token private. This interface has NO identity-bearing tools.");
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startJaneWeb({ workspace: process.env.JANE_WORKSPACE || process.cwd(), port: Number(process.env.JANE_PORT || 8787) })
    .catch(e => { console.error(e); process.exitCode = 1; });
}
