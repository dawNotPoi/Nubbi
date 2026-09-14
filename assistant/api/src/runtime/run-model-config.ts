import type { StoredModelConfig } from "../features/settings/model-config.schema.ts";

/**
 * 为一次运行复制连接配置并绑定请求模型，不修改已保存的默认模型。
 * @param storedConfig 服务端保存的连接配置。
 * @param requestedModel 本次消息明确选择的模型。
 * @returns 仅供当前 Run 使用的配置快照。
 */
export function createRunModelConfig(storedConfig: StoredModelConfig, requestedModel: string): StoredModelConfig {
  const model = requestedModel.trim();
  if (!model) throw new Error("请选择本次使用的模型");
  return { ...storedConfig, headers: { ...storedConfig.headers }, model };
}
