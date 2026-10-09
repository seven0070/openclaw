import { describe, expect, it } from "vitest";
import { janeApprovalForToolCall } from "./approval-policy.js";

const config = { agentId: "jane", protectedTools: ["message", "exec"], safeTools: ["read"] };

describe("Jane native approval policy", () => {
  it("binds a matching protected tool call to exact canonical parameters", () => {
    const result = janeApprovalForToolCall({
      config,
      agentId: "jane",
      toolName: "message",
      toolParams: { to: "owner@example.test", action: "send", message: "Hello" },
    });
    expect(result).toMatchObject({
      requireApproval: {
        allowedDecisions: ["allow-once", "deny"],
        severity: "critical",
      },
    });
    if (!result || !("requireApproval" in result)) {
      throw new Error("Expected approval");
    }
    expect(result.requireApproval.description).toContain(
      'Exact parameters: {"action":"send","message":"Hello","to":"owner@example.test"}',
    );
  });

  it("does not apply outside Jane's agent runtime", () => {
    expect(
      janeApprovalForToolCall({ config, agentId: "main", toolName: "message", toolParams: {} }),
    ).toBeUndefined();
  });

  it("allows only declared read-only tools and denies unknown tool names", () => {
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "read",
        toolParams: { path: "note" },
      }),
    ).toBeUndefined();
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "unlisted_plugin_tool",
        toolParams: {},
      }),
    ).toMatchObject({ block: true });
  });

  it("does not let configuration mark an inherent sensitive tool as safe", () => {
    expect(
      janeApprovalForToolCall({
        config: { agentId: "jane", protectedTools: [], safeTools: ["message", "read"] },
        agentId: "jane",
        toolName: "message",
        toolParams: { action: "send", to: "owner@example.test" },
      }),
    ).toMatchObject({ requireApproval: { allowedDecisions: ["allow-once", "deny"] } });
  });

  it("refuses autonomous changes to its approval boundary even when approved tools are enabled", () => {
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "apply_patch",
        toolParams: { patch: "*** Update File: extensions/jane/src/approval-policy.ts" },
      }),
    ).toMatchObject({ block: true });
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "write",
        toolParams: { path: "/home/owner/.openclaw/openclaw.json", content: "{}" },
      }),
    ).toMatchObject({ block: true });
  });

  it("fails closed for secret-bearing or truncated action details", () => {
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "exec",
        toolParams: { command: "echo no", token: "do-not-display" },
      }),
    ).toMatchObject({ block: true });
    expect(
      janeApprovalForToolCall({
        config,
        agentId: "jane",
        toolName: "exec",
        toolParams: { command: "x".repeat(300) },
      }),
    ).toMatchObject({ block: true });
  });
});
