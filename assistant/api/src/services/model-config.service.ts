import { Injectable } from "@nestjs/common";
import {
  listCodexModels,
  logoutCodex,
  readCodexAccount,
  startCodexDeviceLogin,
} from "../codex/account.js";
import {
  listProviderModels,
  publicModelConfig,
  readModelConfig,
  saveModelConfig,
  type ModelConfigInput,
  type ModelConnectionInput,
  type PublicModelConfig,
} from "../model-config.js";
import { clearCodexThreadIds } from "../store.js";

/** 管理模型配置、Provider 模型列表和 Codex 订阅账号生命周期。 */
@Injectable()
export class ModelConfigService {
  async config(): Promise<PublicModelConfig> {
    return publicModelConfig(await readModelConfig());
  }

  async save(input: ModelConfigInput): Promise<PublicModelConfig> {
    const config = await saveModelConfig(input);
    await clearCodexThreadIds();
    return config;
  }

  models(input: ModelConnectionInput): Promise<string[]> {
    return listProviderModels(input);
  }

  account(): ReturnType<typeof readCodexAccount> {
    return readCodexAccount();
  }

  login(): ReturnType<typeof startCodexDeviceLogin> {
    return startCodexDeviceLogin();
  }

  async logout(): Promise<void> {
    await logoutCodex();
    await clearCodexThreadIds();
  }

  codexModels(): ReturnType<typeof listCodexModels> {
    return listCodexModels();
  }
}
