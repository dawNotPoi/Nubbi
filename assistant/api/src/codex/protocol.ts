export type JsonObject = Record<string, unknown>;

/** Codex App Server 的通用 JSON-RPC 消息结构。 */
export type RpcMessage = {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

/** Codex 账号类型：API Key、ChatGPT 订阅或 Amazon Bedrock。 */
export type CodexAccount =
  | { type: "apiKey" }
  | { type: "chatgpt"; email: string | null; planType: string }
  | { type: "amazonBedrock"; credentialSource?: string };

export type AccountResponse = {
  account: CodexAccount | null;
  requiresOpenaiAuth: boolean;
};

/** 设备码登录的响应，需要用户到 verificationUrl 输入 userCode 完成授权。 */
export type DeviceLoginResponse = {
  type: "chatgptDeviceCode";
  loginId: string;
  verificationUrl: string;
  userCode: string;
};

export type CodexModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  hidden: boolean;
};

/** 模型列表分页响应，nextCursor 为空表示已到最后一页。 */
export type ModelListResponse = {
  data: CodexModel[];
  nextCursor: string | null;
};

/** 传给 Codex 的动态工具定义。 */
export type DynamicToolSpec = {
  type: "function";
  name: string;
  description: string;
  inputSchema: unknown;
};

/** Codex 发起动态工具调用时的参数。 */
export type DynamicToolCallParams = {
  threadId: string;
  turnId: string;
  callId: string;
  namespace: string | null;
  tool: string;
  arguments: unknown;
};

export type DynamicToolCallResponse = {
  contentItems: Array<{ type: "inputText"; text: string }>;
  success: boolean;
};

export type ThreadResponse = {
  thread: { id: string };
  model: string;
};

export type TurnResponse = {
  turn: { id: string; status?: string; error?: { message?: string } | null };
};

export type NotificationListener = (method: string, params: unknown) => void;
export type ServerRequestHandler = (
  method: string,
  params: unknown,
) => Promise<unknown>;

/** 类型守卫：判断值是否为普通对象（非数组、非 null）。 */
export const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 从对象中安全读取字符串字段，类型不对时返回 null。 */
export const readString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  return typeof value[key] === "string" ? value[key] : null;
};
