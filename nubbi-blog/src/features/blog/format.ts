/**
 * 日期明确按中文和上海时区格式化，避免服务器时区影响结果。
 * @param value 接口提供的 ISO 时间。
 * @returns 中文年月日。
 */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

/**
 * 近期文章使用简短日期，旧文章保留完整年月日供读者判断时效。
 * @param value 接口提供的 ISO 时间。
 * @returns 上海时区下的相对天数或完整日期。
 */
export function formatPostDate(value: string): string {
  const offset = 8 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor((Date.now() + offset) / day) - Math.floor((new Date(value).getTime() + offset) / day);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return days > 1 && days < 30 ? `${days} 天前` : formatDate(value);
}

/**
 * 中文字符与英文单词分别估算阅读时间。
 * @param content Markdown 正文。
 * @returns 至少一分钟的阅读估计。
 */
export function readingMinutes(content: string): number {
  const chinese = content.match(/[\u3400-\u9fff]/g)?.length || 0;
  const words = content.match(/[a-zA-Z\d]+/g)?.length || 0;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
}

/**
 * 媒体仅允许公开 HTTP(S) 地址或站内绝对路径。
 * @param value 内容中的媒体地址。
 * @returns 可用于图片的地址，无效值返回 undefined。
 */
export function safeImageUrl(value: string): string | undefined {
  if (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) return value;
  return undefined;
}
