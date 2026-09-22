import request from "@/api/request";
import { authClient } from "@/utils/auth";
import { captureAccountScope, isAccountScopeCurrent } from "@/features/auth/model/account-scope";
import { toast as messageApi } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import {
  normalizeApiTokens,
  type ApiTokenItem,
  type TokenPurpose,
} from "../model";

export const EXPIRY_OPTIONS = [
  { label: "30 天", value: 30 * 24 * 60 * 60 },
  { label: "90 天", value: 90 * 24 * 60 * 60 },
  { label: "1 年", value: 365 * 24 * 60 * 60 },
  { label: "永久", value: 0 },
];

/**
 * 管理 Token 列表和创建后只展示一次的完整密钥。
 * @param open 管理弹窗是否打开。
 * @returns 创建、删除、复制动作及表单状态。
 */
export function useApiTokenManager(open: boolean) {
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [purpose, setPurpose] = useState<TokenPurpose>("mcp");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  /** 加载结果只写回发起请求的账号，旧账号不再弹出全局提示。 */
  const loadTokens = useCallback(async (): Promise<void> => {
    const scope = captureAccountScope();
    if (!scope) return;
    setListLoading(true);
    try {
      const result = await authClient.apiKey.list();
      if (!isAccountScopeCurrent(scope)) return;
      if (result.error) {
        messageApi.error(result.error.message || "获取 Token 列表失败");
        return;
      }
      setTokens(normalizeApiTokens(result.data));
    } catch {
      if (isAccountScopeCurrent(scope)) messageApi.error("获取 Token 列表失败");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadTokens();
      return;
    }

    setTokenName("");
    setExpiresIn(0);
    setPurpose("mcp");
    setCreatedKey(null);
  }, [loadTokens, open]);

  /** 使用所选用途创建 Token，保留完整密钥直至关闭弹窗。 */
  const createToken = async (): Promise<void> => {
    if (creating) return;
    const scope = captureAccountScope();
    if (!scope) return;
    const name = tokenName.trim();
    if (!name || name.length > 32) {
      messageApi.error(!name ? "请输入 Token 名称" : "Token 名称最长 32 个字符");
      return;
    }

    setCreating(true);
    try {
      const body = { name, ...(expiresIn > 0 ? { expiresIn } : {}) };
      let key: string | null = null;
      if (purpose === "mcp") {
        const result = await request<{ key?: string }>("auth/api-key/mcp", body);
        if (!isAccountScopeCurrent(scope)) return;
        if (result.code === 0) {
          messageApi.error(result.message || "Token 创建失败");
          return;
        }
        key = result.data?.key || null;
      } else {
        const result = await authClient.apiKey.create(body);
        if (!isAccountScopeCurrent(scope)) return;
        if (result.error) {
          messageApi.error(result.error.message || "Token 创建失败");
          return;
        }
        key = result.data?.key || null;
      }
      setCreatedKey(key);
      setTokenName("");
      messageApi.success("Token 创建成功");
      await loadTokens();
    } catch {
      if (isAccountScopeCurrent(scope)) messageApi.error("Token 创建失败");
    } finally {
      setCreating(false);
    }
  };

  /** 删除失败继续抛出，由确认框保留现场供用户重试。 */
  const deleteToken = async (token: ApiTokenItem): Promise<void> => {
    const scope = captureAccountScope();
    if (!scope) return;
    setDeletingId(token.id);
    try {
      const result = await authClient.apiKey.delete({ keyId: token.id });
      if (!isAccountScopeCurrent(scope)) return;
      if (result.error) {
        throw new Error(result.error.message || "Token 删除失败");
      }
      messageApi.success("Token 已删除");
      await loadTokens();
    } catch (error) {
      if (isAccountScopeCurrent(scope)) messageApi.error(error instanceof Error ? error.message : "Token 删除失败");
      throw error;
    } finally {
      setDeletingId(null);
    }
  };

  /** 复制当前弹窗中的完整密钥，不使用截断后的列表文本。 */
  const copyCreatedKey = async (): Promise<void> => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      messageApi.success("已复制到剪贴板");
    } catch {
      messageApi.error("复制失败，请手动选中复制");
    }
  };

  return {
    copyCreatedKey, createToken, createdKey, creating,
    deleteToken, deletingId, expiresIn, listLoading, purpose, setExpiresIn,
    setPurpose, setTokenName, tokenName, tokens,
  };
}
