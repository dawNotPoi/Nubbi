/** 协议解析中的未知对象；读取字段前仍需进行类型校验。 */
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

/** Codex 账号查询响应，未登录时 account 为空。 */
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

/** Codex 模型列表项，保留协议模型 ID 与展示信息。 */
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

/** 动态工具回传内容及成功标记，不包含 MCP 连接信息。 */
export type DynamicToolCallResponse = {
  contentItems: Array<{ type: "inputText"; text: string }>;
  success: boolean;
};

/** 线程创建或续接响应，用于保存可恢复的线程 ID。 */
export type ThreadResponse = {
  thread: { id: string };
  model: string;
};

/** 单轮启动响应，提供通知与工具请求的轮次关联 ID。 */
export type TurnResponse = {
  turn: { id: string; status?: string; error?: { message?: string } | null };
};

/** 无需响应的服务端通知订阅函数。 */
export type NotificationListener = (method: string, params: unknown) => void;
/** 需要回传结果的服务端请求处理函数。 */
export type ServerRequestHandler = (method: string, params: unknown) => Promise<unknown>;

/**
 * 类型守卫：判断值是否为普通对象（非数组、非 null）。
 * @param value 任意未知类型的值。
 * @returns 值为普通对象时返回 true，并收窄类型为 JsonObject。
 */
export const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 从对象中安全读取字符串字段，类型不对时返回 null。
 * @param value 目标对象。
 * @param key 要读取的字段名。
 * @returns 字段存在且为字符串时返回其值，否则返回 null。
 */
export const readString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  return typeof value[key] === "string" ? value[key] : null;
};
