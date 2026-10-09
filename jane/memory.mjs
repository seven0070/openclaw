/** Local, persistent Jane conversation memory. No cloud storage. */
import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_FILE = resolve(homedir(), ".jane", "conversation.json");
const MAX_MESSAGES = 40;
const MAX_CONTENT = 12000;

export class JaneMemory {
  constructor({ file = DEFAULT_FILE } = {}) {
    this.file = resolve(file);
    this.messages = [];
  }
  async load() {
    let raw;
    try { raw = await readFile(this.file, "utf8"); }
    catch (error) {
      if (error.code === "ENOENT") { this.messages = []; return this.messages; }
      throw error;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.messages) ||
      !parsed.messages.every(m => m && ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" && m.content.length <= MAX_CONTENT)) {
      throw new Error("Jane memory file is invalid; refusing to overwrite it");
    }
    this.messages = parsed.messages.slice(-MAX_MESSAGES);
    return this.messages;
  }
  async save() {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = this.file + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temp, JSON.stringify({ version: 1, messages: this.messages.slice(-MAX_MESSAGES) }, null, 2), { mode: 0o600, flag: "wx" });
      await rename(temp, this.file);
      await chmod(this.file, 0o600);
    } catch (error) {
      const { unlink } = await import("node:fs/promises");
      await unlink(temp).catch(() => {});
      throw error;
    }
  }
  async appendTurn(user, assistant) {
    if (typeof user !== "string" || typeof assistant !== "string" ||
      user.length > MAX_CONTENT || assistant.length > MAX_CONTENT) {
      throw new TypeError("Invalid or oversized conversation turn");
    }
    this.messages = [...this.messages, { role: "user", content: user }, { role: "assistant", content: assistant }].slice(-MAX_MESSAGES);
    await this.save();
  }
  async clear() {
    this.messages = [];
    await this.save();
  }
}
