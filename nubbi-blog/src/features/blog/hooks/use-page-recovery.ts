"use client";

import { useState } from "react";

/**
 * 重试必须重新请求服务端组件；只重置客户端边界会再次显示旧的失败响应。
 * @returns 重试状态与重新读取当前 URL 的方法。
 */
export function usePageRecovery(): { recovering: boolean; retry: () => void } {
  const [recovering, setRecovering] = useState(false);

  /**
   * 保留搜索和分页 URL，重新发起完整请求以恢复服务端读取。
   * @returns 无返回值。
   */
  function retry(): void {
    setRecovering(true);
    window.location.reload();
  }

  return { recovering, retry };
}
