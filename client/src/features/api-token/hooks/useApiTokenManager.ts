import request from "@/api/request";
import { authClient } from "@/utils/auth";
import { message } from "antd";
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

export function useApiTokenManager(open: boolean) {
  const [messageApi, contextHolder] = message.useMessage();
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [purpose, setPurpose] = useState<TokenPurpose>("mcp");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await authClient.apiKey.list();
      if (result.error) {
        messageApi.error(result.error.message || "获取 Token 列表失败");
        return;
      }
      setTokens(normalizeApiTokens(result.data));
    } catch {
      messageApi.error("获取 Token 列表失败");
    } finally {
      setListLoading(false);
    }
  }, [messageApi]);

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

  const createToken = async () => {
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
        if (result.code === 0) {
          messageApi.error(result.message || "Token 创建失败");
          return;
        }
        key = result.data?.key || null;
      } else {
        const result = await authClient.apiKey.create(body);
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
      messageApi.error("Token 创建失败");
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (token: ApiTokenItem) => {
    setDeletingId(token.id);
    try {
      const result = await authClient.apiKey.delete({ keyId: token.id });
      if (result.error) {
        messageApi.error(result.error.message || "Token 删除失败");
        return;
      }
      messageApi.success("Token 已删除");
      await loadTokens();
    } catch {
      messageApi.error("Token 删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const copyCreatedKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      messageApi.success("已复制到剪贴板");
    } catch {
      messageApi.error("复制失败，请手动选中复制");
    }
  };

  return {
    contextHolder, copyCreatedKey, createToken, createdKey, creating,
    deleteToken, deletingId, expiresIn, listLoading, purpose, setExpiresIn,
    setPurpose, setTokenName, tokenName, tokens,
  };
}
