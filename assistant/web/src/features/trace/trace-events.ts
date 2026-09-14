import { TraceItem } from "./trace-types.ts";

import type { StreamEvent } from "../../types.ts";

/**
 * 把原始运行事件折叠成适合侧边栏时间线展示的条目。
 * @param events 原始 SSE 或 Run 事件列表。
 * @returns 轨迹时间线条目。
 */
export const buildTraceItems = (events: StreamEvent[]): TraceItem[] => {
  const items: TraceItem[] = [];

  const findTool = (event: Extract<StreamEvent, { type: "tool-start" | "tool-result" }>): number => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.kind !== "tool") continue;
      if (event.callId !== undefined && item.id === event.callId) return index;
      if (event.callId === undefined && item.server === event.server && item.tool === event.tool) return index;
    }
    return -1;
  };

  const findApproval = (approvalId: string): number => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.kind === "approval" && item.id === approvalId) return index;
    }
    return -1;
  };

  for (const event of events) {
    if (event.type === "run-started") {
      items.push({ kind: "run", provider: event.provider, timestamp: event.timestamp });
    } else if (event.type === "user-input-request") {
      items.push({ kind: "text", text: `等待用户回答：\n${event.questions.map((question) => question.title).join("\n")}`, timestamp: event.timestamp });
    } else if (event.type === "user-input-resolved") {
      const status = event.status === "answered" ? "已回答" : event.status === "dismissed" ? "已跳过（未授权）" : "已取消";
      items.push({ kind: "text", text: `用户交互${status}`, timestamp: event.timestamp });
    } else if (event.type === "reasoning-delta") {
      const last = items.at(-1);
      if (last?.kind === "reasoning") {
        items[items.length - 1] = { ...last, text: last.text + event.text };
      } else {
        items.push({ kind: "reasoning", text: event.text, timestamp: event.timestamp });
      }
    } else if (event.type === "skill-active") {
      items.push({ kind: "skill", name: event.name, description: event.description, timestamp: event.timestamp });
    } else if (event.type === "tool-start") {
      const id = event.callId ?? `${event.server}/${event.tool}`;
      items.push({
        kind: "tool",
        id,
        server: event.server,
        tool: event.tool,
        arguments: event.arguments,
        status: "running",
        timestamp: event.timestamp,
      });
    } else if (event.type === "tool-result") {
      const index = findTool(event);
      if (index >= 0) {
        const current = items[index];
        if (current?.kind === "tool") {
          items[index] = {
            ...current,
            result: event.result,
            success: event.success,
            durationMs: event.durationMs,
            status: "done",
          };
        }
      } else {
        items.push({
          kind: "tool",
          id: event.callId ?? `${event.server}/${event.tool}`,
          server: event.server,
          tool: event.tool,
          arguments: {},
          result: event.result,
          success: event.success,
          durationMs: event.durationMs,
          status: "done",
          timestamp: event.timestamp,
        });
      }
    } else if (event.type === "approval-request") {
      items.push({
        kind: "approval",
        id: event.approvalId,
        server: event.server,
        tool: event.tool,
        timestamp: event.timestamp,
      });
    } else if (event.type === "approval-resolved") {
      const index = findApproval(event.approvalId);
      if (index >= 0) {
        const current = items[index];
        if (current?.kind === "approval") {
          items[index] = { ...current, approved: event.approved };
        }
      }
    } else if (event.type === "token-usage") {
      const last = items.at(-1);
      if (last?.kind === "token") {
        items[items.length - 1] = { ...last, ...event, kind: "token" };
      } else {
        items.push({
          kind: "token",
          promptTokens: event.promptTokens,
          completionTokens: event.completionTokens,
          totalTokens: event.totalTokens,
          timestamp: event.timestamp,
        });
      }
    } else if (event.type === "run-completed") {
      items.push({ kind: "end", status: "completed", timestamp: event.timestamp });
    } else if (event.type === "run-failed") {
      items.push({
        kind: "end",
        status: event.cancelled ? "cancelled" : "failed",
        message: event.message,
        timestamp: event.timestamp,
      });
    } else if (event.type === "run-abandoned") {
      items.push({ kind: "end", status: "abandoned", message: event.reason, timestamp: event.timestamp });
    } else if (event.type === "error") {
      items.push({ kind: "error", message: event.message, timestamp: event.timestamp });
    }
  }

  return items;
};
