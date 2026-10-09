import type { AnyAgentTool, OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";
import { textResult } from "openclaw/plugin-sdk/tool-results";
import { Type } from "typebox";
import { JaneTaskService, type JaneTask } from "./tasks.js";

type TaskInput = {
  operation: "create" | "list" | "complete" | "cancel";
  title?: string;
  id?: string;
};

const detailsSchema = Type.Object(
  {
    task: Type.Optional(
      Type.Object({
        id: Type.String(),
        title: Type.String(),
        status: Type.String(),
        createdAt: Type.String(),
        updatedAt: Type.String(),
      }),
    ),
    tasks: Type.Optional(Type.Array(Type.Unknown())),
  },
  { additionalProperties: false },
);

export function createJaneTaskTool(
  context: OpenClawPluginToolContext<2>,
  store: PluginStateKeyedStore<JaneTask, 1>,
): AnyAgentTool {
  return {
    name: "jane_tasks",
    label: "Jane tasks",
    description:
      "Create, list, complete, or cancel Jane's persistent local tasks. This tool cannot execute tasks or contact external services.",
    parameters: Type.Object(
      {
        operation: Type.Union([
          Type.Literal("create"),
          Type.Literal("list"),
          Type.Literal("complete"),
          Type.Literal("cancel"),
        ]),
        title: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
        id: Type.Optional(Type.String({ format: "uuid" })),
      },
      { additionalProperties: false },
    ),
    outputSchema: detailsSchema,
    async execute(_id, raw) {
      const input = raw as TaskInput;
      if (!store.withCurrent) {
        return {
          ...textResult("Jane task storage requires a current OpenClaw runtime.", {}),
          isError: true,
        };
      }
      const service = new JaneTaskService(
        store.withCurrent({ assertCurrent: context.assertInvocationCurrent }),
      );
      try {
        if (input.operation === "list") {
          const tasks = await service.list();
          return textResult(`${tasks.length} Jane task(s).`, { tasks });
        }
        if (input.operation === "create") {
          if (!input.title) {
            throw new Error("A task title is required.");
          }
          const task = await service.create(input.title);
          return textResult(`Created task ${task.id}.`, { task });
        }
        if (!input.id) {
          throw new Error("A task ID is required.");
        }
        const task = await service.settle(
          input.id,
          input.operation === "complete" ? "completed" : "cancelled",
        );
        return textResult(`Task ${task.status}.`, { task });
      } catch (error) {
        return {
          ...textResult(error instanceof Error ? error.message : "Jane task operation failed.", {}),
          isError: true,
        };
      }
    },
  };
}
