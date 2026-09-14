import { randomUUID } from "node:crypto";
import type { RuntimeEvent, RuntimeEventPayload } from "./events.js";
import { appendRunEvent } from "./run-store.js";

export type RuntimeEventEmitter = {
  emit: (payload: RuntimeEventPayload) => RuntimeEvent;
  flush: () => Promise<void>;
};

export const createRuntimeEventEmitter = (input: {
  runId: string;
  conversationId: string;
  agentId: string;
  parentRunId?: string;
  onEvent: (event: RuntimeEvent) => void;
}): RuntimeEventEmitter => {
  let sequence = 0;
  const pending: Promise<void>[] = [];
  return {
    emit: (payload) => {
      const event: RuntimeEvent = {
        ...payload,
        eventId: randomUUID(),
        runId: input.runId,
        conversationId: input.conversationId,
        sequence: ++sequence,
        timestamp: new Date().toISOString(),
        agentId: input.agentId,
        parentRunId: input.parentRunId,
      };
      try {
        input.onEvent(event);
      } catch (error) {
        console.error("Runtime 事件订阅者处理失败", error);
      }
      if (event.type !== "text-delta") pending.push(appendRunEvent(event));
      return event;
    },
    flush: async () => {
      const failures = (await Promise.allSettled(pending))
        .filter((result) => result.status === "rejected");
      if (failures.length) console.error(`Run 日志写入失败：${failures.length} 个事件未保存`);
    },
  };
};
