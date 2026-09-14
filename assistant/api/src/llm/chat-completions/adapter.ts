import { readServerSentEvents } from "@nubbi/assistant-shared/streaming";
import type { ModelAdapter, ModelTurnInput, ModelTurnResult } from "../model-adapter.ts";
import { completionSchema, serializeMessage } from "./protocol.ts";
import { CompletionAccumulator } from "./response.ts";

/** 创建适配器所需的连接参数，不向 Agent 泄露密钥或端点。 */
export type ModelConnection = {
  modelBaseUrl: string;
  modelApiKey: string;
  modelName: string;
  headers: Record<string, string>;
  temperature?: number;
};

/**
 * 创建 Chat Completions 协议适配器；fetch 可替换为模拟传输。
 * @param connection 模型连接设置。
 * @param fetchResponse HTTP 传输实现。
 * @returns 只负责单轮调用的适配器。
 */
export function createChatCompletionsAdapter(
  connection: ModelConnection,
  fetchResponse: typeof fetch = fetch,
): ModelAdapter {
  return {
    generateTurn: async (input: ModelTurnInput): Promise<ModelTurnResult> => {
      input.abortSignal.throwIfAborted();
      if (!connection.modelBaseUrl || !connection.modelName) throw new Error("模型未配置，请填写 Base URL 并选择模型");
      const headers = new Headers({ "Content-Type": "application/json" });
      if (connection.modelApiKey) headers.set("Authorization", `Bearer ${connection.modelApiKey}`);
      Object.entries(connection.headers).forEach(([name, value]) => headers.set(name, value));
      const tools = input.toolDefinitions.map((definition) => ({
        type: "function",
        function: {
          name: definition.name,
          description: definition.description,
          parameters: definition.inputSchema,
        },
      }));
      const response = await fetchResponse(
        new URL("chat/completions", `${connection.modelBaseUrl.replace(/\/+$/, "")}/`),
        {
          method: "POST",
          headers,
          signal: input.abortSignal,
          body: JSON.stringify({
            model: connection.modelName,
            messages: [{ role: "system", content: input.instructions }, ...input.messages.map(serializeMessage)],
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? "auto" : undefined,
            temperature: connection.temperature ?? 0.3,
            stream: true,
            stream_options: { include_usage: true },
          }),
        },
      );
      if (!response.ok) throw new Error(`模型请求失败 (${response.status})：${(await response.text()).slice(0, 300)}`);
      const accumulator = new CompletionAccumulator(input.onDelta);
      if (!(response.headers.get("content-type") ?? "").includes("text/event-stream")) {
        const json: unknown = await response.json().catch(() => {
          throw new Error("模型返回了非 JSON 响应，请检查 Base URL");
        });
        accumulator.accept(completionSchema.parse(json));
      } else {
        if (!response.body) throw new Error("模型返回了空的流式响应");
        let receivedDone = false;
        for await (const event of readServerSentEvents(response.body, input.abortSignal)) {
          if (event.data === "[DONE]") {
            receivedDone = true;
            break;
          }
          accumulator.accept(completionSchema.parse(JSON.parse(event.data)));
        }
        if (!receivedDone && accumulator.finish().stopReason === "unknown") throw new Error("模型流在完成前意外中断");
      }
      input.abortSignal.throwIfAborted();
      return accumulator.finish();
    },
  };
}
