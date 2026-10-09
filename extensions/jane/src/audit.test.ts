import { describe, expect, it } from "vitest";
import { JaneAuditService, janeAuditParameterDigest } from "./audit.js";

function store() {
  const values = new Map<string, unknown>();
  return {
    register: async (key: string, value: unknown) => values.set(key, value),
    entries: async () => [...values.entries()].map(([key, value]) => ({ key, value })),
  };
}

describe("Jane audit history", () => {
  it("records only a parameter digest and never a secret-bearing payload", async () => {
    const audit = new JaneAuditService(store() as never);

    const record = await audit.record({
      toolName: "message",
      toolParams: { to: "owner", token: "do-not-store" },
      outcome: "completed",
      toolCallId: "call-1",
    });

    expect(record).toMatchObject({
      toolName: "message",
      parameterDigest: null,
      outcome: "completed",
      toolCallId: "call-1",
    });
    expect(JSON.stringify(await audit.list())).not.toContain("do-not-store");
  });

  it("uses a stable digest for safely reviewable parameters", () => {
    expect(janeAuditParameterDigest({ b: 2, a: "one" })).toBe(
      janeAuditParameterDigest({ a: "one", b: 2 }),
    );
  });
});
