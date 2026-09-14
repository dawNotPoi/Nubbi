import { auth } from "@/lib/auth";
import {
  createMcpPermissions,
  MCP_TOKEN_METADATA,
} from "@/lib/mcpPolicy";

export type CreateMcpApiKeyInput = {
  name: string;
  expiresIn?: number;
};

type CreateMcpApiKeyResult = Awaited<
  ReturnType<typeof auth.api.createApiKey>
>;

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
