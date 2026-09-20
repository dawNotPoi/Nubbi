import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { rehypeCallouts } from "../markdown/callouts";
import { markdownComponents } from "./markdown-renderers";

/**
 * 正文解析与高亮留在服务端，仅增强需要交互的节点；不执行原始 HTML。
 * @param props 当前公开文章的 Markdown。
 * @returns 包含链接卡片、提示块和代码高亮的正文。
 */
export function Markdown({ content }: { content: string }): ReactElement {
  return (
    <div id="article-body" className="prose">
      <ReactMarkdown
        skipHtml
        remarkRehypeOptions={{
          footnoteLabel: "注释",
          footnoteBackLabel: "返回正文引用",
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeCallouts]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
