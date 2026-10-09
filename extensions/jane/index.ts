import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  JANE_REQUIRED_APPROVAL_TOOLS,
  JANE_SAFE_TOOLS,
  isJaneSafeTool,
  janeApprovalForToolCall,
  type JaneConfig,
} from "./src/approval-policy.js";
import { JaneAuditService, type JaneAuditRecord } from "./src/audit.js";
import type { JaneTask } from "./src/tasks.js";
import { createJaneTaskTool } from "./src/tool.js";

function parseConfig(value: unknown): JaneConfig {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const agentId =
    typeof input.agentId === "string" && input.agentId.trim() ? input.agentId.trim() : "jane";
  const list = (candidate: unknown, fallback: string[]) =>
    Array.isArray(candidate)
      ? candidate.filter(
          (tool): tool is string => typeof tool === "string" && tool.trim().length > 0,
        )
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
    const audit = api.runtime.state.openKeyedStore<JaneAuditRecord>({
      namespace: "audit",
      maxEntries: 10_000,
      overflowPolicy: "reject-new",
    });
    const auditService = new JaneAuditService(audit);
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
    // These read-only bindings supply the dashboard widgets. Mutations stay on
    // jane_tasks so a dashboard cannot become an alternate task-action path.
    api.registerGatewayMethod(
      "jane.status",
      async ({ respond }) =>
        respond(true, {
          agentId: config.agentId,
          nativeApprovalSurface: true,
          tasks: true,
          auditHistory: true,
        }),
      { scope: "operator.read", profileAccess: "independent" },
    );
    api.registerGatewayMethod(
      "jane.tasks.list",
      async ({ respond }) =>
        respond(true, {
          tasks: (await tasks.entries())
            .map((entry) => entry.value)
            .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        }),
      { scope: "operator.read" },
    );
    api.registerGatewayMethod(
      "jane.audit.list",
      async ({ respond }) => respond(true, { records: await auditService.list() }),
      { scope: "operator.read" },
    );
    api.session.controls.registerControlUiDescriptor({
      surface: "widget",
      id: "tasks",
      label: "Jane tasks",
      description: "Persistent Jane tasks. Task changes run through the Jane task tool.",
      requiredScopes: ["operator.read"],
    });
    api.session.controls.registerControlUiDescriptor({
      surface: "widget",
      id: "audit-history",
      label: "Jane audit history",
      description: "Sanitized receipts for completed and failed Jane tool calls.",
      requiredScopes: ["operator.read"],
    });
    api.on("after_tool_call", async (event, context) => {
      if (context.agentId !== config.agentId) {
        return;
      }
      try {
        await auditService.record({
          toolName: event.toolName,
          toolParams: event.params,
          outcome: event.error ? "failed" : "completed",
          ...(event.toolCallId ? { toolCallId: event.toolCallId } : {}),
        });
      } catch {
        // Audit telemetry must not turn a completed tool operation into an
        // apparent failure. The host audit stream remains authoritative.
      }
    });
  },
});
