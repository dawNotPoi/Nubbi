import { useEffect, useState } from "react";
import { getModelConfig } from "../../api/model.ts";
import { readConfigToken } from "../../platform/connection-storage.ts";

/**
 * 读取新会话默认模型；关闭设置后刷新，不覆盖已有会话的选择。
 * @param baseUrl 服务端地址。
 * @param settingsOpen 设置是否正在编辑。
 * @returns 默认模型与加载错误。
 */
export function useDefaultModel(baseUrl: string, settingsOpen: boolean): { model: string; error: string | null } {
  const [state, setState] = useState({ model: "", error: null as string | null });
  useEffect(() => {
    let active = true;
    if (settingsOpen) return;
    const load = async (): Promise<void> => {
      try {
        const token = await readConfigToken();
        if (!token) throw new Error("请在设置中解锁配置，或为会话填写模型 ID");
        const config = await getModelConfig(baseUrl, token);
        if (active) setState({ model: config.model, error: null });
      } catch (error) {
        if (active) setState({ model: "", error: error instanceof Error ? error.message : "读取默认模型失败" });
      }
    };
    void load();
    return () => { active = false; };
  }, [baseUrl, settingsOpen]);
  return state;
}
