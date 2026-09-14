import { Injectable } from "@nestjs/common";
import {
  listCodexModels,
  logoutCodex,
  readCodexAccount,
  startCodexDeviceLogin,
} from "../../integrations/codex/account.ts";
import { listProviderModels } from "./model-catalog.ts";
import { publicModelConfig, readModelConfig, saveModelConfig } from "./model-config.repository.ts";
import { type ModelConfigInput, type ModelConnectionInput, type PublicModelConfig } from "./model-config.schema.ts";
import { clearCodexThreadIds } from "../conversations/conversation.repository.ts";

/** 管理模型配置、Provider 模型列表和 Codex 订阅账号生命周期。 */
@Injectable()
export class ModelConfigService {
  /**
   * 读取当前对外可见的模型配置。
   * @returns 不含 API Key 原文的配置。
   */
  async config(): Promise<PublicModelConfig> {
    return publicModelConfig(await readModelConfig());
  }

  /**
   * 保存模型配置，并清空所有 Codex 线程引用。
   * @param input 客户端提交的模型配置。
   * @returns 保存后对外可见的配置。
   */
  async save(input: ModelConfigInput): Promise<PublicModelConfig> {
    const config = await saveModelConfig(input);
    await clearCodexThreadIds();
    return config;
  }

  /**
   * 拉取 Provider 可用模型列表。
   * @param input 连接参数。
   * @returns 模型 ID 列表。
   */
  models(input: ModelConnectionInput): Promise<string[]> {
    return listProviderModels(input);
  }

  /**
   * 读取 Codex 账号信息。
   * @returns 账号状态。
   */
  account(): ReturnType<typeof readCodexAccount> {
    return readCodexAccount();
  }

  /**
   * 发起 Codex 设备码登录。
   * @returns 设备登录信息。
   */
  login(): ReturnType<typeof startCodexDeviceLogin> {
    return startCodexDeviceLogin();
  }

  /**
   * 退出 Codex 登录并清空线程引用。
   * @returns 无返回值。
   */
  async logout(): Promise<void> {
    await logoutCodex();
    await clearCodexThreadIds();
  }

  /**
   * 拉取全部 Codex 模型。
   * @returns Codex 模型列表。
   */
  codexModels(): ReturnType<typeof listCodexModels> {
    return listCodexModels();
  }
}
