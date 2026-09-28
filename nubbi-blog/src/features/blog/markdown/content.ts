import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Nodes, Root } from "mdast";

const markdownParser = unified().use(remarkParse).use(remarkGfm);

/**
 * 提取阅读文字，不把代码块、图片、HTML 和链接地址当作介绍。
 * @param node Markdown 语法节点。
 * @returns 可展示的纯文本。
 */
function textContent(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "break") return " ";
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
}

/**
 * 摘要从真实段落获取，避免正则把表格分隔线和图表源码拼进正文。
 * @param content 公开文章 Markdown。
 * @returns 最多 180 个字符的摘要，无有效段落时为空。
 */
export function summarizeMarkdown(content: string): string {
  const tree = markdownParser.parse(content);
  for (const block of tree.children) {
    const candidates = block.type === "blockquote" ? block.children : [block];
    for (const node of candidates) {
      if (node.type !== "paragraph") continue;
      const text = textContent(node).replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, "")
        .replace(/\s+/g, " ").trim();
      if (!text) continue;
      const characters = Array.from(text);
      return characters.length > 180 ? `${characters.slice(0, 179).join("")}…` : text;
    }
  }
  return "";
}

/** 标题比较仅统一 Unicode 与空白，不模糊删除相近标题。 */
function normalizeTitle(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * 页面已有文章标题时，只省略正文开头完全相同的一级标题。
 * @param options 当前文章的真实标题。
 * @returns 保留其余节点和源位置的转换函数。
 */
export function remarkArticleTitle(options: { title: string }): (tree: Root) => void {
  /** 仅处理首个块级节点，不改写原始 Markdown。 */
  return (tree: Root): void => {
    const first = tree.children[0];
    if (first?.type === "heading" && first.depth === 1
      && normalizeTitle(textContent(first)) === normalizeTitle(options.title)) tree.children.shift();
  };
}
