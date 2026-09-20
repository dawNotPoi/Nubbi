"use client";

import { useReaderDialog } from "./use-reader-dialog";

/**
 * 图片预览复用阅读对话框的焦点恢复与滚动锁定。
 * @returns 预览状态、对话框引用和开关方法。
 */
export function useImagePreview(): ReturnType<typeof useReaderDialog> {
  return useReaderDialog();
}
