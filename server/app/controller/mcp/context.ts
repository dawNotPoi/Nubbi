import {
  MCP_LIMITS,
  MCP_NOTE_ACTIONS,
  type McpNoteAction,
} from "@/lib/mcpPolicy";
import type { RequestAuthContext } from "@/middleware/common";
import { httpError, toIsoString } from "./shared";

/** MCP 上下文结果类型：向 Agent 暴露账号、能力、限制信息 */
export type McpContextResult = {
  user: { id: string };
  token: {
    id: string;
    name: string | null;
    kind: "mcp";
    policyVersion: unknown;
    expiresAt: string | null;
  };
  capabilities: { note: McpNoteAction[] };
  limits: typeof MCP_LIMITS;
};

/** 获取 MCP 上下文：校验 API Key 类型，返回 Agent 可用的能力和限制 */
export const getMcpContext = (
  context?: RequestAuthContext,
): McpContextResult => {
  if (context?.method !== "apiKey" || !context.apiKey) {
    throw httpError(401, "An MCP Agent API key is required");
  }

  return {
    user: { id: context.user.id },
    token: {
      id: context.apiKey.id,
      name: context.apiKey.name,
      kind: "mcp",
      policyVersion: context.apiKey.metadata?.policyVersion ?? null,
      expiresAt: toIsoString(context.apiKey.expiresAt),
    },
    capabilities: {
      note: MCP_NOTE_ACTIONS.filter((action) =>
        context.apiKey?.permissions?.note?.includes(action),
      ),
    },
    limits: MCP_LIMITS,
  };
};
