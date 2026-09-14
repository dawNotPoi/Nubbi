type McpServerBase = {
  // 新增时由后端按名称生成，保存后必有值。
  id?: string;
  name: string;
  enabled: boolean;
};

/** MCP 连接配置，支持 HTTP 与 stdio，传输细节不进入模型上下文。 */
export type McpServerConfig = McpServerBase & {
  // http：远端 Streamable HTTP 地址；stdio：本地启动命令。
  transport?: "http" | "stdio";
  url?: string;
  headers: Record<string, string>;
  command?: string;
  args?: string[];
  // stdio 子进程可选工作目录。
  cwd?: string;
  env: Record<string, string>;
};

/** MCP 连接检查的展示结果，不包含鉴权信息。 */
export type McpConnectionTest = {
  serverName: string;
  // 旧版服务端可能省略数量或工具清单，前端展示时需要兜底。
  toolCount?: number;
  tools?: Array<{ name: string; description: string }>;
};

/** 客户端公开模型配置，仅提供密钥是否已配置的标记。 */
export type ModelConfig = {
  provider: "openai-compatible" | "codex-subscription";
  authType: "api-key" | "chatgpt";
  baseUrl: string;
  model: string;
  systemPrompt: string;
  headers: Record<string, string>;
  temperature?: number;
  contextWindow?: number;
  apiKeyConfigured: boolean;
};

/** 客户端可展示的订阅账号状态，不含登录凭据。 */
export type CodexAccount = {
  account: null | { type: string; email?: string | null; planType?: string };
  requiresOpenaiAuth: boolean;
};

/** 当前可发现的 Skill 与 MCP 服务视图。 */
export type ExtensionInfo = {
  skills: Array<{ name: string; description: string; enabled: boolean }>;
  servers: Array<{
    id: string;
    name: string;
    transport: "http" | "stdio";
    endpoint: string;
    enabled: boolean;
    toolCount: number;
  }>;
};

/** Codex 模型列表项，保留协议模型 ID 与展示信息。 */
export type CodexModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
};

/** 设备码登录展示信息，用户需要在验证地址完成授权。 */
export type DeviceLogin = {
  type: "chatgptDeviceCode";
  loginId: string;
  verificationUrl: string;
  userCode: string;
};

/** 模型设置写入契约，区分保持密钥与显式清除。 */
export type ModelConfigInput = Omit<ModelConfig, "apiKeyConfigured"> & {
  apiKey?: string;
  clearApiKey?: boolean;
};
