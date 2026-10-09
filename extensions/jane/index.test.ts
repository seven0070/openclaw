import { describe, expect, it, vi } from "vitest";
import janePlugin from "./index.js";

describe("Jane native plugin entry", () => {
  it("registers its optional task tool and trusted pre-execution approval policy", () => {
    const registeredTools: unknown[] = [];
    const policies: Array<{
      id: string;
      evaluate: (
        event: { toolName: string; params: unknown },
        context: { agentId?: string },
      ) => unknown;
    }> = [];
    const api = {
      pluginConfig: { agentId: "jane", protectedTools: ["message"], safeTools: ["read"] },
      runtime: {
        state: {
          openKeyedStore: vi.fn(() => ({})),
        },
      },
      registerTool: (tool: unknown) => registeredTools.push(tool),
      registerTrustedToolPolicy: (policy: {
        id: string;
        evaluate: (
          event: { toolName: string; params: unknown },
          context: { agentId?: string },
        ) => unknown;
      }) => policies.push(policy),
    };

    janePlugin.register(api as never);

    expect(registeredTools).toHaveLength(1);
    expect(policies).toHaveLength(1);
    expect(policies[0]?.id).toBe("owner-approval");
    expect(
      policies[0]?.evaluate(
        { toolName: "message", params: { action: "send", to: "owner" } },
        { agentId: "jane" },
      ),
    ).toMatchObject({
      requireApproval: { allowedDecisions: ["allow-once", "deny"] },
    });
  });

  it("only exposes Jane's persistent task tool to the configured Jane agent", () => {
    const registeredTools: Array<{ create?: (context: { agentId?: string }) => unknown }> = [];
    const api = {
      pluginConfig: { agentId: "jane" },
      runtime: { state: { openKeyedStore: vi.fn(() => ({})) } },
      registerTool: (tool: { create?: (context: { agentId?: string }) => unknown }) =>
        registeredTools.push(tool),
      registerTrustedToolPolicy: () => {},
    };

    janePlugin.register(api as never);

    expect(registeredTools[0]?.create?.({ agentId: "other-agent" })).toBeNull();
    expect(registeredTools[0]?.create?.({ agentId: "jane" })).toMatchObject({ name: "jane_tasks" });
  });

  it("does not allow configuration to downgrade an inherent sensitive tool", () => {
    const registeredTools: unknown[] = [];
    const policies: Array<
      (event: { toolName: string; params: unknown }, context: { agentId?: string }) => unknown
    > = [];
    const api = {
      pluginConfig: { agentId: "jane", protectedTools: [], safeTools: ["message", "read"] },
      runtime: {
        state: {
          openKeyedStore: vi.fn(() => ({})),
        },
      },
      registerTool: (tool: unknown) => registeredTools.push(tool),
      registerTrustedToolPolicy: (policy: {
        evaluate: (
          event: { toolName: string; params: unknown },
          context: { agentId?: string },
        ) => unknown;
      }) => policies.push(policy.evaluate),
    };

    janePlugin.register(api as never);

    expect(
      policies[0]?.(
        { toolName: "message", params: { action: "send", to: "owner" } },
        { agentId: "jane" },
      ),
    ).toMatchObject({
      requireApproval: { allowedDecisions: ["allow-once", "deny"] },
    });
  });
});
