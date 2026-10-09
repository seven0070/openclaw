import { describe, expect, it } from "vitest";
import { JaneTaskService } from "./tasks.js";

function createStore() {
  const values = new Map<string, { value: unknown; comparison: string }>();
  return {
    async register(key: string, value: unknown) {
      values.set(key, { value, comparison: crypto.randomUUID() });
    },
    async entries() {
      return [...values.entries()].map(([key, entry]) => ({
        key,
        value: entry.value,
        createdAt: 0,
      }));
    },
    async observe(key: string) {
      const entry = values.get(key);
      return { value: entry?.value, comparison: entry?.comparison ?? "missing" };
    },
    async compareAndApply(key: string, comparison: string, intent: { value: unknown }) {
      const current = values.get(key);
      if (!current || current.comparison !== comparison) {
        return { status: "conflict" as const, current: { value: current?.value } };
      }
      values.set(key, { value: intent.value, comparison: crypto.randomUUID() });
      return { status: "applied" as const };
    },
  };
}

describe("JaneTaskService", () => {
  it("persists, lists, and settles tasks through the state-store contract", async () => {
    const service = new JaneTaskService(createStore() as never);
    const task = await service.create("Review Jane change");
    expect((await service.list()).map((entry) => entry.id)).toEqual([task.id]);
    await expect(service.settle(task.id, "completed")).resolves.toMatchObject({
      status: "completed",
    });
  });
});
