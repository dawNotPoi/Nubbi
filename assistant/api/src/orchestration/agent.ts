import { executeToolCalls, skillToolName } from "./tool-executor.js";
import { requestModel } from "../model/model.js";
import type { ProviderExecutorInput } from "../runtime/provider-executor.js";
import type { Skill } from "./skills.js";
import type { MessagePart, ModelMessage, ModelTool } from "../types.js";

// 最大执行轮数：防止模型陷入无限工具调用循环。
const maxTurns = 8;
// 达到轮数上限时的兜底提示。
const limitText = "已达到最大执行轮数，请缩小问题范围后重试。";

/**
 * 为 Skill 激活构造一个专用 function 工具，名称枚举当前可用 Skill。
 * @param skills 当前可用的 Skill 列表，工具的 name 枚举取自每个 Skill 的 name。
 * @returns 符合 OpenAI function calling 格式的 ModelTool 定义。
 */
const skillTool = (skills: Skill[]): ModelTool => ({
  type: "function",
  function: {
    name: skillToolName,
    description: "按需激活最适合当前任务的 Skill，同一个 Skill 不要重复激活。",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", enum: skills.map((skill) => skill.name) },
      },
      required: ["name"],
    },
  },
});

/**
 * 组装系统提示：基础人设 + 可用 Skill 清单。
 * @param skills 可用 Skill 列表，用于生成“- 名称: 描述”形式的清单。
 * @param configuredPrompt 用户在模型配置中填写的自定义系统提示词，为空时使用默认人设。
 * @returns 拼接后的完整系统提示文本。
 */
const systemPrompt = (skills: Skill[], configuredPrompt: string): string =>
  [
    configuredPrompt ||
      "你是一个简洁、可靠的个人对话助手。按需调用工具，不要虚构结果。",
    "可用 Skill：",
    skills.length
      ? skills
          .map((skill) => `- ${skill.name}: ${skill.description}`)
          .join("\n")
      : "当前没有可用 Skill。",
  ].join("\n\n");

/**
 * 把长文本切成小段逐个推送，前端能更流畅地渲染流式输出。
 * @param text 待推送的完整文本。
 * @param emit 事件回调，用于逐段发送 text-delta 事件。
 * @returns 无返回值。
 */
const emitText = (text: string, emit: ProviderExecutorInput["emit"]): void => {
  (text.match(/[\s\S]{1,36}/g) ?? []).forEach((chunk) => {
    emit({ type: "text-delta", text: chunk });
  });
};

/**
 * OpenAI 兼容 Provider 的 Agent 执行入口：
 * 以手写循环编排“模型 ↔ 工具”循环（类似 pi 的代码原生 agent 循环），
 * 替代原来的 LangGraph 图编排，返回最终消息 parts。
 * @param input Provider 执行上下文，包含上下文消息、模型配置、工具网关与取消信号。
 * @returns 最终助手消息的内容块数组（文本 / Skill 激活 / 工具执行 / 错误等）。
 */
export const runAgent = async (
  input: ProviderExecutorInput,
): Promise<MessagePart[]> => {
  const modelTools = input.tools.map((tool) => tool.modelTool);
  // 添加 skill 选择工具，模型通过它按需激活技能。
  if (input.skills.length) modelTools.push(skillTool(input.skills));
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt(input.skills, input.modelConfig.systemPrompt),
    },
    ...input.context.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
  const parts: MessagePart[] = [];
  // 本 Run 已激活的 Skill 集合，避免重复激活。
  const activeSkills = new Set<string>();

  // 循环：每次迭代先调模型，有工具调用则执行并回填，直到无工具调用或达到轮数上限。
  for (let turn = 0; turn < maxTurns; turn += 1) {
    input.signal.throwIfAborted();
    const reply = await requestModel(
      messages,
      modelTools,
      input.signal,
      input.modelConfig,
      // 流式增量实时推送给前端：文本与推理 token 各自成事件。
      (delta) => {
        if (delta.text) input.emit({ type: "text-delta", text: delta.text });
        if (delta.reasoning) input.emit({ type: "reasoning-delta", text: delta.reasoning });
      },
    );
    // 原样保留模型返回的 assistant 消息，供后续轮次继续传递。
    messages.push(reply.assistantMessage);

    // 没有工具调用说明模型已给出最终回答，收尾返回。
    if (!reply.toolCalls.length) {
      const text = reply.content.trim() || "任务已完成。";
      // 文本已通过 onDelta 实时推送；仅在模型没有任何文本产出时补发兜底提示。
      if (!reply.content.trim()) emitText(text, input.emit);
      parts.push({ type: "text", text });
      return parts;
    }

    // 执行本轮的批量工具调用，并把结果回填进消息历史。
    const results = await executeToolCalls(reply.toolCalls, {
      skills: input.skills,
      activeSkills,
      gateway: input.gateway,
      emit: input.emit,
    });
    results.forEach((result, index) => {
      const call = reply.toolCalls[index];
      if (!call) return;
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content,
      });
      parts.push(...result.parts);
      // Skill 激活返回的指令正文作为 system 消息注入下一轮。
      if (result.instruction) {
        messages.push({ role: "system", content: result.instruction });
      }
    });
  }

  // 达到最大轮数仍未结束，推送兜底提示并结束。
  emitText(limitText, input.emit);
  parts.push({ type: "text", text: limitText });
  return parts;
};
