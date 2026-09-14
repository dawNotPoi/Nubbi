import type { Dispatch, SetStateAction } from "react";
import type { McpConnectionTest, McpServerConfig } from "../../types.ts";

/** AssistantSettings 的视图状态及动作契约。 */
export type AssistantSettingsState = {
  configAccessToken: string;
  tokenInput: string;
  setTokenInput: Dispatch<SetStateAction<string>>;
  servers: McpServerConfig[];
  editing: McpServerConfig | null | undefined;
  setEditing: Dispatch<SetStateAction<McpServerConfig | null | undefined>>;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  notice: string | null;
  section: "model" | "mcp";
  setSection: Dispatch<SetStateAction<"model" | "mcp">>;
  unlock: () => Promise<void>;
  save: (value: McpServerConfig) => Promise<void>;
  remove: (server: McpServerConfig) => Promise<void>;
  test: (value: McpServerConfig) => Promise<McpConnectionTest>;
  toggle: (server: McpServerConfig) => Promise<void>;
  lock: () => void;
};
