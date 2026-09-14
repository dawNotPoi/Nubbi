import { randomUUID } from "node:crypto";
import type { RuntimeEvent, RuntimeEventPayload } from "./events.js";
import { appendRunEvent } from "./run-store.js";

export type RuntimeEventEmitter = {
  emit: (payload: RuntimeEventPayload) => RuntimeEvent;
  flush: () => Promise<void>;
};

/**
 * 创建事件发射器：
 * 每条事件自动补全 eventId、sequence、时间戳等元信息，
 * 同步推送给 SSE 订阅者，同时异步落库（text-delta 高频事件除外）。
 */
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
      // 订阅者抛错不能中断主流程，只记录日志。
      try {
        input.onEvent(event);
      } catch (error) {
        console.error("Runtime 事件订阅者处理失败", error);
      }
      // 流式文本增量逐字落库开销大，只保留非 text-delta 事件用于审计。
      if (event.type !== "text-delta") pending.push(appendRunEvent(event));
      return event;
    },
    flush: async () => {
      // 等待全部异步落库完成；个别失败只告警，不阻塞 Run 收尾。
      const failures = (await Promise.allSettled(pending))
        .filter((result) => result.status === "rejected");
      if (failures.length) console.error(`Run 日志写入失败：${failures.length} 个事件未保存`);
    },
  };
};
