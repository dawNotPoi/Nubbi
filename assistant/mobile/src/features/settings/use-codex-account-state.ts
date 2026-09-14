import type { CodexAccount, DeviceLogin } from "../../types.ts";

/** CodexAccount 的视图状态及动作契约。 */
export type CodexAccountState = {
  account: CodexAccount | null;
  login: DeviceLogin | null;
  refreshCodex: () => Promise<boolean>;
  beginLogin: () => Promise<void>;
  signOut: () => Promise<void>;
};
