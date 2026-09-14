import { MCP_LIMITS, MCP_NOTE_ACTIONS } from "@/lib/mcpPolicy";
import type { RequestAuthContext } from "@/middleware/common";
import { httpError, toIsoString } from "./shared";

export const getMcpContext = (context?: RequestAuthContext) => {
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
