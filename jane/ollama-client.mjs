/** Jane local Ollama client. No external dependency; localhost-only by default. */
const DEFAULT_BASE = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3:4b";
export function resolveOllamaBase(value = DEFAULT_BASE) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Jane only allows a local HTTP Ollama endpoint");
  }
  return url.origin;
}
export class JaneOllamaClient {
  constructor({ baseUrl = DEFAULT_BASE, model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 120000 } = {}) {
    this.baseUrl = resolveOllamaBase(baseUrl);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/.test(model)) throw new Error("Invalid model name");
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }
  async request(path, payload) {
    const response = await this.fetchImpl(this.baseUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Ollama request failed (HTTP ${response.status})`);
    return response.json();
  }
  async chat(messages, { system = "You are Jane, a helpful local personal AI assistant." } = {}) {
    if (!Array.isArray(messages) || !messages.every(m =>
      m && ["user", "assistant", "system"].includes(m.role) && typeof m.content === "string")) {
      throw new TypeError("messages must be an array of role/content entries");
    }
    const result = await this.request("/api/chat", {
      model: this.model,
      stream: false,
      messages: [{ role: "system", content: system }, ...messages],
    });
    if (!result?.message || typeof result.message.content !== "string") {
      throw new Error("Ollama returned no assistant message");
    }
    return result.message.content;
  }
}
