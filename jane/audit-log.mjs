/** Append-only JSONL audit events for Jane's trusted execution components. */
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export class JaneAuditLog {
  constructor({ file }) {
    if (!file) throw new TypeError("Audit log file required");
    this.file = resolve(file);
  }
  async record(event) {
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("Invalid event");
    const { actionId, kind, outcome, reason } = event;
    if (typeof actionId !== "string" || typeof kind !== "string" || typeof outcome !== "string")
      throw new TypeError("Invalid audit fields");
    // Never log payloads, authentication secrets, approval tokens or destinations.
    const record = { at: new Date().toISOString(), actionId, kind, outcome };
    if (typeof reason === "string") record.reason = reason.slice(0, 100);
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
    await appendFile(this.file, JSON.stringify(record) + "\n", { encoding: "utf8", mode: 0o600, flag: "a" });
  }
}
