import type { ModelConfig } from "../../types.ts";

/** ModelSwitcher 的视图状态及动作契约。 */
export type ModelSwitcherState = {
  config: ModelConfig | null;
  models: string[];
  currentModel: string;
  planType: string | undefined;
  loading: boolean;
  error: string | null;
  unlocked: boolean;
  refresh: () => Promise<void>;
  switchModel: (model: string) => Promise<void>;
};
