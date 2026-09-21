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

/**
 * 为已认证用户创建固定策略的 MCP Key，不转发外部请求上下文。
 * @param userId 路由认证后取得的账号 ID，不接受请求体指定归属。
 * @param input 已校验的名称和有效期。
 * @returns 新建的 MCP API Key。
 */
export const createMcpApiKey = (
  userId: string,
  input: CreateMcpApiKeyInput,
): Promise<CreateMcpApiKeyResult> =>
  auth.api.createApiKey({
    body: {
      configId: "default",
      name: input.name,
      expiresIn: input.expiresIn,
      userId,
      metadata: MCP_TOKEN_METADATA,
      permissions: createMcpPermissions(),
    },
  });
