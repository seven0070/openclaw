import { createHash } from "node:crypto";

const MAX_EXACT_PARAMETERS = 260;
const SECRET_KEY = /(?:api[_-]?key|authorization|cookie|credential|password|secret|token)/i;

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
  if (params.config.safeTools.includes(params.toolName)) {
    return undefined;
  }
  if (!params.config.protectedTools.includes(params.toolName)) {
    return {
      block: true,
      blockReason:
        "Jane blocked this tool because it is neither read-only nor configured for one-time owner approval.",
    };
  }
  try {
    const canonical = JSON.stringify(canonicalize(params.toolParams));
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
          `Target: ${targetFor(canonicalize(params.toolParams) as Record<string, unknown>)}`,
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
