import { createHash } from "node:crypto";

const MAX_EXACT_PARAMETERS = 260;
const SECRET_KEY = /(?:api[_-]?key|authorization|cookie|credential|password|secret|token)/i;

/**
 * These names are part of Jane's security contract. Configuration may add
 * further protected tools, but it must never downgrade one of these into an
 * unreviewed action.
 */
export const JANE_REQUIRED_APPROVAL_TOOLS = [
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
] as const;

/** Only these non-mutating Jane capabilities can be configured as safe. */
export const JANE_SAFE_TOOLS = ["read", "jane_tasks"] as const;
const JANE_REQUIRED_APPROVAL_TOOL_SET = new Set<string>(JANE_REQUIRED_APPROVAL_TOOLS);
const JANE_SAFE_TOOL_SET = new Set<string>(JANE_SAFE_TOOLS);

export function isJaneSafeTool(toolName: string): boolean {
  return JANE_SAFE_TOOL_SET.has(toolName);
}

export type JaneConfig = {
  agentId: string;
  protectedTools: readonly string[];
  safeTools: readonly string[];
};

type ApprovalRequest = {
  requireApproval: {
    title: string;
    description: string;
    severity: "critical";
    timeoutMs: number;
    allowedDecisions: ["allow-once", "deny"];
  };
};

type PolicyResult = ApprovalRequest | { block: true; blockReason: string } | undefined;

function canonicalize(value: unknown, depth = 0): unknown {
  if (depth > 16) {
    throw new Error("parameters are nested too deeply to review safely");
  }
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry, depth + 1));
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("parameters are not a reviewable JSON value");
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).toSorted()) {
    if (SECRET_KEY.test(key)) {
      throw new Error("parameters contain a secret-bearing field");
    }
    result[key] = canonicalize((value as Record<string, unknown>)[key], depth + 1);
  }
  return result;
}

function targetFor(params: Record<string, unknown>): string {
  for (const key of ["to", "target", "url", "path", "command", "action"]) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 128);
    }
  }
  return "the requested action";
}

function changesJaneSafetyBoundary(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.replaceAll("\\", "/").toLowerCase();
    return (
      normalized.includes("extensions/jane/") ||
      normalized.includes("plugins.entries.jane") ||
      /(?:^|\/)openclaw\.json(?:$|[^a-z0-9_-])/.test(normalized)
    );
  }
  if (Array.isArray(value)) {
    return value.some(changesJaneSafetyBoundary);
  }
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Object.values(value as Record<string, unknown>).some(changesJaneSafetyBoundary)
  );
}

/**
 * Create a one-shot approval only for a fully rendered, immutable parameter
 * snapshot. The OpenClaw runtime freezes that snapshot before the approval is
 * delivered and invokes the tool only after an authenticated approval resolves.
 */
export function janeApprovalForToolCall(params: {
  config: JaneConfig;
  agentId?: string;
  toolName: string;
  toolParams: unknown;
}): PolicyResult {
  if (params.agentId !== params.config.agentId) {
    return undefined;
  }
  const requiresApproval =
    JANE_REQUIRED_APPROVAL_TOOL_SET.has(params.toolName) ||
    params.config.protectedTools.includes(params.toolName);
  if (!requiresApproval) {
    if (isJaneSafeTool(params.toolName) && params.config.safeTools.includes(params.toolName)) {
      return undefined;
    }
    return {
      block: true,
      blockReason:
        "Jane blocked this tool because it is neither read-only nor configured for one-time owner approval.",
    };
  }
  try {
    const reviewableParams = canonicalize(params.toolParams);
    if (
      (params.toolName === "apply_patch" || params.toolName === "write") &&
      changesJaneSafetyBoundary(reviewableParams)
    ) {
      return {
        block: true,
        blockReason:
          "Jane cannot change its own approval policy or OpenClaw configuration. Make and review that change outside Jane's autonomous runtime.",
      };
    }
    const canonical = JSON.stringify(reviewableParams);
    if (canonical.length > MAX_EXACT_PARAMETERS) {
      return {
        block: true,
        blockReason:
          "Jane blocked this action because its exact parameters are too long for a safe owner review.",
      };
    }
    const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
    return {
      requireApproval: {
        title: `Jane: approve ${params.toolName}`,
        description: [
          `Target: ${targetFor(reviewableParams as Record<string, unknown>)}`,
          `Exact parameters: ${canonical}`,
          `SHA-256: ${digest}`,
        ].join("\n"),
        severity: "critical",
        timeoutMs: 120_000,
        allowedDecisions: ["allow-once", "deny"],
      },
    };
  } catch (error) {
    return {
      block: true,
      blockReason: `Jane blocked this action because it cannot be safely reviewed: ${error instanceof Error ? error.message : "invalid parameters"}.`,
    };
  }
}
