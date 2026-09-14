import type { RunSummary } from "../../types.ts";

/**
 * 把 ISO 时间格式化为 HH:mm:ss。
 * @param value 可选 ISO 时间字符串。
 * @returns 格式化后的本地时间；无值时返回空字符串。
 */
export const formatTime = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour12: false });
};

/**
 * Run 状态的中文展示文本。
 * @param status Run 状态。
 * @returns 中文状态文案。
 */
export const runStatusText = (status: RunSummary["status"]): string =>
  ({
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
    abandoned: "已中断",
  })[status];
