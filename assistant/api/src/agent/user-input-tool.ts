import { ASK_USER_TOOL_NAME } from "@nubbi/assistant-shared/contracts";
import type { ToolDefinition } from "../tools/tool-contracts.ts";

/** 给两种执行器的交互规则；询问不是工具服务的权限替代品。 */
export const USER_INPUT_INSTRUCTIONS = "需要用户补充信息、选择方案或确认行动时，调用 ask_user，提供清晰问题和选项并允许其他回答。不要仅输出问句就结束任务。提问必须单独调用，收到回答后再决定其他工具调用；跳过、取消和未回答都不是同意。不得将用户对某项行动的确认扩大到其他行动。";
/** 用户提问能力的模型描述，实际等待由交互模块负责，不注册为业务工具。 */
export const askUserDefinition: ToolDefinition = {
  name: ASK_USER_TOOL_NAME,
  description: "向用户提问并等待回答，用于澄清、方案选择和行动确认。一次 1–3 题，选项不包含其他项，允许自定义输入时界面自动提供。必须单独调用，得到回答后再调用其他工具。",
  inputSchema: {
    type: "object", additionalProperties: false, required: ["questions"],
    properties: { questions: {
      type: "array", minItems: 1, maxItems: 3, items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "options", "allowCustomAnswer"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          title: { type: "string", minLength: 1, maxLength: 2000 },
          allowCustomAnswer: { type: "boolean" },
          options: { type: "array", maxItems: 6, items: {
            type: "object", additionalProperties: false, required: ["id", "label"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              label: { type: "string", minLength: 1, maxLength: 200 },
              description: { type: "string", maxLength: 1000 },
            },
          } },
        },
      },
    } },
  },
};
