import type { Dispatch, SetStateAction } from "react";
import type { ModelConfig } from "../../types.ts";
import { type KeyValuePair } from "./mcp-form-utils.ts";

/** ModelSettings 的视图状态及动作契约。 */
export type ModelSettingsState = {
  config: ModelConfig;
  setConfig: Dispatch<SetStateAction<ModelConfig>>;
  apiKey: string;
  setApiKey: Dispatch<SetStateAction<string>>;
  clearApiKey: boolean;
  setClearApiKey: Dispatch<SetStateAction<boolean>>;
  headerPairs: KeyValuePair[];
  setHeaderPairs: Dispatch<SetStateAction<KeyValuePair[]>>;
  temperature: string;
  setTemperature: Dispatch<SetStateAction<string>>;
  contextWindow: string;
  setContextWindow: Dispatch<SetStateAction<string>>;
  models: string[];
  loading: boolean;
  message: string | null;
  setMessage: Dispatch<SetStateAction<string | null>>;
  receiveCodexModels: (values: string[]) => void;
  fetchModels: () => Promise<void>;
  save: () => Promise<void>;
  changeProvider: (provider: ModelConfig["provider"]) => void;
  modelOptions: string[];
};
