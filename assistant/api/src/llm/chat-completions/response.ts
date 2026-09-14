import type { ModelContentBlock, ModelDelta, ModelTurnResult } from "../model-adapter.ts";
import {
  CHAT_COMPLETIONS_ADAPTER_ID,
  parseToolArguments,
  readCompletionUsage,
  readStopReason,
  type CompletionPayload,
} from "./protocol.ts";

/** 一轮响应的增量收集器，同时记录显示顺序和供应商续接字段。 */
export class CompletionAccumulator {
  private readonly blocks: ModelContentBlock[] = [];
  private readonly calls = new Map<number, { id: string; name: string; arguments: string }>();
  private readonly callPositions = new Map<number, number>();
  private usage: ModelTurnResult["usage"] = null;
  private stopReason: ModelTurnResult["stopReason"] = "unknown";
  private rawMessage: Record<string, unknown> = {};

  /**
   * 绑定增量回调。
   * @param onDelta 内容增量的发布函数。
   */
  public constructor(private readonly onDelta: (delta: ModelDelta) => void) {}

  /**
   * 接收一帧已校验数据；普通 JSON 响应与 SSE 使用相同归并路径。
   * @param payload 响应数据。
   * @returns 无返回值。
   */
  public accept(payload: CompletionPayload): void {
    if (payload.error) throw new Error(payload.error.message);
    if (payload.usage) this.usage = readCompletionUsage(payload.usage);
    const choice = payload.choices?.find((item) => item.index === undefined || item.index === 0);
    if (!choice) return;
    if (choice.finish_reason) this.stopReason = readStopReason(choice.finish_reason);
    const message = choice.message;
    if (message) this.rawMessage = message;
    const delta = choice.delta ?? message;
    if (!delta) return;
    if (delta.refusal) this.stopReason = "refused";
    if (delta.reasoning_content) this.appendText("reasoning", delta.reasoning_content);
    if (delta.content) this.appendText("text", delta.content);
    const incomingCalls = choice.delta?.tool_calls ?? message?.tool_calls?.map((call, index) => ({ ...call, index }));
    for (const fragment of incomingCalls ?? []) {
      let call = this.calls.get(fragment.index);
      if (!call) {
        call = { id: "", name: "", arguments: "" };
        this.calls.set(fragment.index, call);
        this.callPositions.set(fragment.index, this.blocks.length);
        this.blocks.push({
          type: "tool-call",
          toolCall: { callId: "", toolName: "", input: { valid: false, raw: "", error: "工具调用尚未完成" } },
        });
      }
      if (fragment.id) call.id = fragment.id;
      if (fragment.function?.name) call.name += fragment.function.name;
      call.arguments += fragment.function?.arguments ?? "";
    }
  }

  /**
   * 完成组装，缺失 ID、名称或结束原因不会被视为成功。
   * @returns 包含续接信息的统一响应。
   */
  public finish(): ModelTurnResult {
    const toolCalls = [...this.calls].map(([index, call]) => {
      if (!call.id || !call.name) throw new Error("模型返回了不完整的工具调用");
      const toolCall = { callId: call.id, toolName: call.name, input: parseToolArguments(call.arguments) };
      this.blocks[this.callPositions.get(index)!] = { type: "tool-call", toolCall };
      return toolCall;
    });
    if (new Set(toolCalls.map((call) => call.callId)).size !== toolCalls.length)
      throw new Error("模型返回了重复的工具调用 ID");
    const content = this.blocks.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const reasoning = this.blocks.flatMap((block) => (block.type === "reasoning" ? [block.text] : [])).join("");
    const rawCalls = [...this.calls.values()].map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: call.arguments },
    }));
    return {
      message: {
        role: "assistant",
        blocks: this.blocks,
        continuation: {
          adapterId: CHAT_COMPLETIONS_ADAPTER_ID,
          data: {
            ...this.rawMessage,
            content: content || null,
            reasoning_content: reasoning || null,
            tool_calls: rawCalls.length ? rawCalls : undefined,
          },
        },
      },
      toolCalls,
      usage: this.usage,
      stopReason: this.stopReason,
    };
  }

  /** 合并相邻的同类文本块，同时立即发布增量。 */
  private appendText(type: "text" | "reasoning", text: string): void {
    const previous = this.blocks.at(-1);
    if (previous?.type === type) previous.text += text;
    else this.blocks.push({ type, text });
    this.onDelta({ type, text });
  }
}
