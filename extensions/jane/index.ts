import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  JANE_REQUIRED_APPROVAL_TOOLS,
  JANE_SAFE_TOOLS,
  isJaneSafeTool,
  janeApprovalForToolCall,
  type JaneConfig,
} from "./src/approval-policy.js";
import type { JaneTask } from "./src/tasks.js";
import { createJaneTaskTool } from "./src/tool.js";

function parseConfig(value: unknown): JaneConfig {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const agentId =
    typeof input.agentId === "string" && input.agentId.trim() ? input.agentId.trim() : "jane";
  const list = (candidate: unknown, fallback: string[]) =>
    Array.isArray(candidate)
      ? candidate.filter((tool): tool is string => typeof tool === "string" && tool.trim())
      : fallback;
  const protectedTools = list(input.protectedTools, [...JANE_REQUIRED_APPROVAL_TOOLS]);
  const safeTools = list(input.safeTools, [...JANE_SAFE_TOOLS]);
  return {
    agentId,
    protectedTools: [...new Set([...JANE_REQUIRED_APPROVAL_TOOLS, ...protectedTools])],
    // A configuration typo or malicious config edit must not turn an
    // identity-bearing tool into an unreviewed execution path.
    safeTools: [...new Set(safeTools.filter(isJaneSafeTool))],
  };
}

export default definePluginEntry({
  id: "jane",
  name: "Jane",
  description: "Local-assistant task management and action-specific owner approvals.",
  register(api) {
    const config = parseConfig(api.pluginConfig);
    const tasks = api.runtime.state.openKeyedStore<JaneTask>({
      namespace: "tasks",
      maxEntries: 10_000,
      overflowPolicy: "reject-new",
    });
    api.registerTool(
      {
        contextVersion: 2,
        // Keep Jane's persistent task surface out of other agents even when a
        // broad plugin tool allowlist is configured globally.
        create: (context) =>
          context.agentId === config.agentId ? createJaneTaskTool(context, tasks) : null,
      },
      { name: "jane_tasks", optional: true },
    );
    api.registerTrustedToolPolicy({
      id: "owner-approval",
      description:
        "Fails closed for unclassified Jane tools and requires an authenticated one-time owner approval before sensitive tool execution.",
      // No matcher: unknown aliases and newly added native tools are evaluated
      // and denied rather than becoming an alternate execution path.
      evaluate(event, context) {
        return janeApprovalForToolCall({
          config,
          agentId: context.agentId,
          toolName: event.toolName,
          toolParams: event.params,
        });
      },
    });
  },
});
