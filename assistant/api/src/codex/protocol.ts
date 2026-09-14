export type JsonObject = Record<string, unknown>;

export type RpcMessage = {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

export type CodexAccount =
  | { type: "apiKey" }
  | { type: "chatgpt"; email: string | null; planType: string }
  | { type: "amazonBedrock"; credentialSource?: string };

export type AccountResponse = {
  account: CodexAccount | null;
  requiresOpenaiAuth: boolean;
};

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

export type ModelListResponse = {
  data: CodexModel[];
  nextCursor: string | null;
};

export type DynamicToolSpec = {
  type: "function";
  name: string;
  description: string;
  inputSchema: unknown;
};

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

export const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  return typeof value[key] === "string" ? value[key] : null;
};
