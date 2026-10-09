import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { janeApprovalForToolCall, type JaneConfig } from "./src/approval-policy.js";
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
  const protectedTools = list(input.protectedTools, [
    "message",
    "browser",
    "exec",
    "apply_patch",
    "write",
    "cron",
    "gateway",
    "computer",
    "nodes",
    "sessions",
  ]);
  const safeTools = list(input.safeTools, ["read", "jane_tasks"]);
  return {
    agentId,
    protectedTools: [...new Set(protectedTools)],
    safeTools: [...new Set(safeTools)],
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
        create: (context) => createJaneTaskTool(context, tasks),
      },
      { name: "jane_tasks", optional: true },
    );
    api.on("before_tool_call", (event, context) =>
      janeApprovalForToolCall({
        config,
        agentId: context.agentId,
        toolName: event.toolName,
        toolParams: event.params,
      }),
    );
  },
});
