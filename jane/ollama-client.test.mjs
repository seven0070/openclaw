import test from "node:test";
import assert from "node:assert/strict";
import { JaneOllamaClient, resolveOllamaBase } from "./ollama-client.mjs";
test("only local Ollama endpoints are accepted", () => {
  assert.equal(resolveOllamaBase(), "http://127.0.0.1:11434");
  assert.throws(() => resolveOllamaBase("https://example.com"));
  assert.throws(() => resolveOllamaBase("http://localhost:11434/other"));
});
test("chat uses Qwen3-4B and returns assistant response", async () => {
  let captured;
  const client = new JaneOllamaClient({ fetchImpl: async (url, options) => {
    captured = { url, ...options };
    return { ok: true, json: async () => ({ message: { role: "assistant", content: "Hello from Jane" } }) };
  } });
  assert.equal(await client.chat([{ role: "user", content: "Hi" }]), "Hello from Jane");
  assert.equal(captured.url, "http://127.0.0.1:11434/api/chat");
  assert.equal(JSON.parse(captured.body).model, "qwen3:4b");
  assert.equal(JSON.parse(captured.body).stream, false);
});
test("chat rejects malformed messages", async () => {
  const client = new JaneOllamaClient();
  await assert.rejects(() => client.chat([{ role: "tool", content: "unsafe" }]), TypeError);
});
