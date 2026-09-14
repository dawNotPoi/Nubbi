import {
  MCP_LIMITS,
  MCP_NOTE_ACTIONS,
  type McpNoteAction,
} from "@/lib/mcpPolicy";
import type { RequestAuthContext } from "@/middleware/common";
import { httpError, toIsoString } from "./shared";

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
