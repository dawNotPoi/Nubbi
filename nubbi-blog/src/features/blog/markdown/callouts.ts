type MarkdownNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownNode[];
};

/**
 * 在语法树识别 GitHub 提示块，避免误伤代码和普通引用。
 * @returns 只修改引用起始标记的转换器。
 */
export function rehypeCallouts(): (tree: MarkdownNode) => void {
  /**
   * 保留提示块内部 Markdown、链接和源位置。
   * @param tree 当前服务端 HTML 语法树。
   * @returns 无返回值。
   */
  return function transform(tree): void {
    const pending = [tree];
    while (pending.length) {
      const node = pending.pop();
      if (!node) continue;
      if (node.children) pending.push(...node.children);
      if (node.tagName !== "blockquote") continue;
      const paragraph = node.children?.find((child) => child.tagName === "p");
      const first = paragraph?.children?.[0];
      const match =
        first?.type === "text"
          ? first.value?.match(
              /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n|$)/,
            )
          : null;
      if (!match || !first) continue;
      first.value = first.value?.slice(match[0].length);
      node.properties = {
        ...node.properties,
        "data-callout": match[1].toLowerCase(),
      };
      if (
        paragraph?.children?.every(
          (child) => child.type === "text" && !child.value?.trim(),
        )
      )
        node.children = node.children?.filter((child) => child !== paragraph);
    }
  };
}
