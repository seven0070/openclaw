import { createHash, randomUUID } from "node:crypto";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

export type JaneAuditOutcome = "completed" | "failed";

/**
 * Deliberately minimal activity receipt. The host has the authoritative tool
 * trace; this Jane-specific view must never copy action arguments or outputs
 * that could contain credentials, private paths, or tool-returned secrets.
 */
export type JaneAuditRecord = {
  id: string;
  at: string;
  toolName: string;
  parameterDigest: string | null;
  outcome: JaneAuditOutcome;
  toolCallId?: string;
};

const SECRET_KEY = /(?:api[_-]?key|authorization|cookie|credential|password|secret|token)/i;

function canonicalize(value: unknown, depth = 0): unknown {
  if (depth > 16) {
    throw new Error("parameters are nested too deeply");
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
    throw new Error("parameters are not JSON");
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

export function janeAuditParameterDigest(params: unknown): string | null {
  try {
    return createHash("sha256")
      .update(JSON.stringify(canonicalize(params)), "utf8")
      .digest("hex");
  } catch {
    // A digest would still be a durable correlation identifier for an unsafe
    // payload. Omit it entirely when the request cannot be safely inspected.
    return null;
  }
}

export class JaneAuditService {
  constructor(private readonly store: PluginStateKeyedStore<JaneAuditRecord>) {}

  async record(params: {
    toolName: string;
    toolParams: unknown;
    outcome: JaneAuditOutcome;
    toolCallId?: string;
  }): Promise<JaneAuditRecord> {
    const record: JaneAuditRecord = {
      id: randomUUID(),
      at: new Date().toISOString(),
      toolName: params.toolName,
      parameterDigest: janeAuditParameterDigest(params.toolParams),
      outcome: params.outcome,
      ...(params.toolCallId ? { toolCallId: params.toolCallId } : {}),
    };
    await this.store.register(record.id, record);
    return record;
  }

  async list(limit = 100): Promise<JaneAuditRecord[]> {
    const bounded = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 100;
    return (await this.store.entries())
      .map((entry) => entry.value)
      .toSorted((left, right) => right.at.localeCompare(left.at))
      .slice(0, bounded);
  }
}
