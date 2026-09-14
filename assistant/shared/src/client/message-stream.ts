import type { StreamEvent } from "../contracts/index.ts";
import { readServerSentEvents } from "../streaming/sse.ts";
import { readResponseError, type AssistantConnection } from "./http-transport.ts";

/** 发送消息需要的请求参数，按 conversationId 绑定接收目标。 */
export type StreamMessageInput = {
  conversationId: string;
  content: string;
  model: string;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
};

/**
 * 发送消息并读取到 done；异常断流不当作成功完成。
 * @param connection 平台连接。
 * @param input 消息、取消信号和事件订阅者。
 * @returns 完成时返回；错误或取消时拒绝。
 */
export async function streamAssistantMessage(
  connection: AssistantConnection,
  input: StreamMessageInput,
): Promise<void> {
  const response = await connection.fetchResponse(
    `${connection.assistantApiBaseUrl.replace(/\/+$/, "")}/api/conversations/${input.conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ content: input.content, model: input.model }),
      signal: input.signal,
    },
  );
  if (!response.ok) throw new Error(await readResponseError(response));
  if (!response.body) throw new Error("当前平台不支持流式响应");
  let completed = false;
  for await (const frame of readServerSentEvents(response.body, input.signal)) {
    const payload: unknown = JSON.parse(frame.data);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("服务端返回了无效事件");
    const event = { ...payload, type: frame.event } as StreamEvent;
    if (event.conversationId && event.conversationId !== input.conversationId) continue;
    input.onEvent(event);
    if (event.type === "done") {
      completed = true;
      break;
    }
  }
  input.signal.throwIfAborted();
  if (!completed) throw new Error("连接在消息完成前中断，请重试或重新加载对话");
}
