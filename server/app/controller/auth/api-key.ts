import { auth } from "@/lib/auth";
import {
  createMcpPermissions,
  MCP_TOKEN_METADATA,
} from "@/lib/mcpPolicy";

/** 创建 MCP API Key 的输入参数 */
export type CreateMcpApiKeyInput = {
  name: string;
  expiresIn?: number;
};

/** MCP API Key 创建结果类型 */
type CreateMcpApiKeyResult = Awaited<
  ReturnType<typeof auth.api.createApiKey>
>;

/** 创建 MCP API Key：绑定 MCP 元数据和笔记权限集 */
export const createMcpApiKey = (
  userId: string,
  input: CreateMcpApiKeyInput,
  headers: HeadersInit,
): Promise<CreateMcpApiKeyResult> =>
  auth.api.createApiKey({
    body: {
      name: input.name,
      expiresIn: input.expiresIn,
      userId,
      metadata: MCP_TOKEN_METADATA,
      permissions: createMcpPermissions(),
    },
    headers,
  });
