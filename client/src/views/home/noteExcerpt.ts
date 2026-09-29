/**
 * 从 Markdown 中提取短正文预览，跳过标题、图片与代码，不渲染用户 HTML。
 * @param content 原始 Markdown 正文。
 * @param title 当前笔记标题，用于避免重复展示。
 * @returns 最长 160 字符的纯文本摘录。
 */
export function noteExcerpt(content: string, title: string): string {
  return content
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "")
    .replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g, " ")
    .replace(/~~~[^\n]*\n[\s\S]*?(?:~~~|$)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:#{1,6}\s|\|)/.test(line) && line.trim() !== title.trim())
    .map((line) => line.replace(/^\s*(?:[-*+>]\s+|\d+\.\s+)/, "").replace(/[*_`~]/g, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
