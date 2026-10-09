import { describe, expect, it, vi } from "vitest";
import janePlugin from "./index.js";

describe("Jane native plugin entry", () => {
  it("registers its optional task tool and pre-execution approval hook", () => {
    const registeredTools: unknown[] = [];
    const hooks: Array<
      (event: { toolName: string; params: unknown }, context: { agentId?: string }) => unknown
    > = [];
    const api = {
      pluginConfig: { agentId: "jane", protectedTools: ["message"], safeTools: ["read"] },
      runtime: {
        state: {
          openKeyedStore: vi.fn(() => ({})),
        },
      },
      registerTool: (tool: unknown) => registeredTools.push(tool),
      on: (
        _name: string,
        handler: (
          event: { toolName: string; params: unknown },
          context: { agentId?: string },
        ) => unknown,
      ) => hooks.push(handler),
    };

    janePlugin.register(api as never);

    expect(registeredTools).toHaveLength(1);
    expect(hooks).toHaveLength(1);
    expect(
      hooks[0]?.(
        { toolName: "message", params: { action: "send", to: "owner" } },
        { agentId: "jane" },
      ),
    ).toMatchObject({
      requireApproval: { allowedDecisions: ["allow-once", "deny"] },
    });
  });
});
