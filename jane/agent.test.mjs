import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JaneAgent } from "./agent.mjs";
import { JaneToolGateway } from "./tool-gateway.mjs";

test("Jane selects a read-only tool and summarizes its result", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-agent-"));
  try {
    await writeFile(join(dir, "hello.txt"), "Example file");
    const replies = ['{"tool":"read_text","path":"hello.txt"}', "The file says Example file."];
    const client = { chat: async () => replies.shift() };
    const agent = new JaneAgent({ client, gateway: new JaneToolGateway({ workspace: dir }) });
    assert.equal(await agent.respond([], "What is in hello.txt?"), "The file says Example file.");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("Jane refuses unsupported model tool requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "jane-agent-"));
  try {
    const client = { chat: async () => '{"tool":"run_shell","path":"."}' };
    const agent = new JaneAgent({ client, gateway: new JaneToolGateway({ workspace: dir }) });
    assert.equal(await agent.respond([], "run a command"), '{"tool":"run_shell","path":"."}');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
