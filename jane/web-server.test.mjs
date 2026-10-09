import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";
import { createJaneWebServer } from "./web-server.mjs";

function rawGet(url, host) {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { host } }, (res) => {
      res.resume();
      res.once("end", () => resolve(res.statusCode));
    });
    req.once("error", reject);
    req.end();
  });
}

test("local web UI serves HTML and JS, rejects unauthorized API calls", async () => {
  const memory = {
    messages: [],
    clear: async function () {
      this.messages = [];
    },
    appendTurn: async function (user, assistant) {
      this.messages.push(
        { role: "user", content: user },
        { role: "assistant", content: assistant },
      );
    },
  };
  const agent = { respond: async (_history, prompt) => "Echo: " + prompt };
  const { server, token } = createJaneWebServer({ agent, memory, token: "test-secret" });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const page = await fetch(base + "/");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Jane/);
    const script = await fetch(base + "/ui.js");
    assert.equal(script.status, 200);
    assert.match(await script.text(), /getElementById/);
    assert.equal((await fetch(base + "/api/history")).status, 401);
    assert.equal(await rawGet(base + "/api/history", "attacker.invalid"), 403);
    assert.equal(
      (
        await fetch(base + "/api/history", {
          headers: { "x-jane-token": token, origin: "https://attacker.invalid" },
        })
      ).status,
      403,
    );
    const reply = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "x-jane-token": token, "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Hi" }),
    });
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { answer: "Echo: Hi" });
    assert.equal(memory.messages.length, 2);
    const clear = await fetch(base + "/api/forget", {
      method: "POST",
      headers: { "x-jane-token": token },
    });
    assert.equal(clear.status, 200);
    assert.equal(memory.messages.length, 0);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
});
