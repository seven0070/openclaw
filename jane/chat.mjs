#!/usr/bin/env node
/** Local Jane chat with persistent, user-clearable conversation memory. */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { JaneOllamaClient } from "./ollama-client.mjs";
import { JaneMemory } from "./memory.mjs";

const client = new JaneOllamaClient();
const memory = new JaneMemory();
await memory.load();
const rl = readline.createInterface({ input: stdin, output: stdout });
console.log("Jane (local Qwen3-4B). Type /exit to quit, /forget to clear local chat history.");
try {
  while (true) {
    const prompt = (await rl.question("You> ")).trim();
    if (prompt === "/exit") break;
    if (prompt === "/forget") {
      await memory.clear();
      console.log("Jane> Local conversation history cleared.");
      continue;
    }
    if (!prompt) continue;
    if (prompt.length > 12000) { console.error("Jane> Message too long."); continue; }
    try {
      const answer = await client.chat([...memory.messages, { role: "user", content: prompt }]);
      await memory.appendTurn(prompt, answer);
      console.log("Jane> " + answer);
    } catch (error) {
      console.error("Jane error: " + error.message);
    }
  }
} finally { rl.close(); }
