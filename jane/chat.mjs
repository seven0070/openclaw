#!/usr/bin/env node
/** Local terminal prototype: Jane talking to Qwen3-4B via Ollama. */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { JaneOllamaClient } from "./ollama-client.mjs";
const client = new JaneOllamaClient();
const rl = readline.createInterface({ input: stdin, output: stdout });
const history = [];
console.log("Jane (local Qwen3-4B). Type /exit to quit.");
try {
  while (true) {
    const prompt = (await rl.question("You> ")).trim();
    if (prompt === "/exit") break;
    if (!prompt) continue;
    try {
      const answer = await client.chat([...history, { role: "user", content: prompt }]);
      history.push({ role: "user", content: prompt }, { role: "assistant", content: answer });
      console.log("Jane> " + answer);
    } catch (error) {
      console.error("Jane error: " + error.message);
    }
  }
} finally { rl.close(); }
