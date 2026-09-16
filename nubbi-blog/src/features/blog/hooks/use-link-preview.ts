"use client";

import { useEffect, useState } from "react";
import type { LinkPreview } from "../links/contracts";
import type { LinkTarget } from "../links/model";
import { requestLinkPreview } from "../links/request";

/**
 * 仅在读者需要时获取预览，组件卸载后忽略结果，共享请求仍可供其他链接复用。
 * @param target 归一化的链接地址。
 * @param enabled 是否已进入视口或打开预览。
 * @returns 摘要和可用于稳定占位的加载状态。
 */
export function useLinkPreview(
  target: LinkTarget,
  enabled: boolean,
): { data: LinkPreview | null; loading: boolean } {
  const [result, setResult] = useState<{
    url: string;
    data: LinkPreview | null;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    requestLinkPreview(target).then(
      (data) => {
        if (current) setResult({ url: target.url, data });
      },
      () => {
        if (current) setResult({ url: target.url, data: null });
      },
    );
    return () => {
      current = false;
    };
  }, [target, enabled]);
  const settled = result?.url === target.url;
  return { data: settled ? result.data : null, loading: enabled && !settled };
}
