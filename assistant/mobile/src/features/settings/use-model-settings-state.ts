import type { Dispatch, SetStateAction } from "react";
import type { CodexAccount, DeviceLogin } from "../../types.ts";
import type { ModelConfig } from "../../types.ts";
import { type ModelHeader } from "./model-draft.ts";

/** ModelSettings 的视图状态及动作契约。 */
export type ModelSettingsState = {
  config: ModelConfig;
  setConfig: Dispatch<SetStateAction<ModelConfig>>;
  apiKey: string;
  setApiKey: Dispatch<SetStateAction<string>>;
  clearApiKey: boolean;
  setClearApiKey: Dispatch<SetStateAction<boolean>>;
  headerPairs: ModelHeader[];
  setHeaderPairs: Dispatch<SetStateAction<ModelHeader[]>>;
  temperature: string;
  setTemperature: Dispatch<SetStateAction<string>>;
  models: string[];
  account: CodexAccount | null;
  login: DeviceLogin | null;
  busy: boolean;
  message: string;
  danger: boolean;
  beginLogin: () => Promise<void>;
  signOut: () => Promise<void>;
  loadModels: () => Promise<void>;
  save: () => Promise<void>;
  changeProvider: (provider: ModelConfig["provider"]) => void;
  updateHeader: (index: number, patch: Partial<ModelHeader>) => void;
};
