import { randomUUID } from "node:crypto";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

export type JaneTask = {
  id: string;
  title: string;
  status: "open" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export class JaneTaskService {
  constructor(private readonly store: PluginStateKeyedStore<JaneTask, 2>) {}

  async create(title: string): Promise<JaneTask> {
    const normalized = title.trim();
    if (!normalized || normalized.length > 500) {
      throw new Error("Task title must contain 1 to 500 characters.");
    }
    const now = new Date().toISOString();
    const task: JaneTask = {
      id: randomUUID(),
      title: normalized,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.register(task.id, task);
    return task;
  }

  async list(): Promise<JaneTask[]> {
    return (await this.store.entries())
      .map((entry) => entry.value)
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async settle(id: string, status: "completed" | "cancelled"): Promise<JaneTask> {
    if (!/^[a-f0-9-]{36}$/i.test(id)) {
      throw new Error("Task ID is invalid.");
    }
    const observation = await this.store.observe(id);
    if (!observation.value) {
      throw new Error("Task not found.");
    }
    const task: JaneTask = { ...observation.value, status, updatedAt: new Date().toISOString() };
    const result = await this.store.compareAndApply(id, observation.comparison, {
      operation: "update",
      action: "set",
      value: task,
    });
    if (result.status === "conflict") {
      throw new Error("Task changed concurrently; review it and retry.");
    }
    return task;
  }
}
