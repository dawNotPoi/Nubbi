import {
  Info,
  Lightbulb,
  TriangleAlert,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import type { ReactElement } from "react";
import Image from "next/image";
import type { Components } from "react-markdown";
import { safeImageUrl } from "../format";
import { heading, nodeText } from "../markdown/nodes";
import { CopyButton } from "./copy-button";
import { ArticleImage } from "./article-image";
import { MarkdownAnchor, MarkdownParagraph } from "./markdown-links";

const notices = {
  note: { title: "说明", icon: Info },
  tip: { title: "提示", icon: Lightbulb },
  important: { title: "重要", icon: Sparkles },
  warning: { title: "注意", icon: TriangleAlert },
  caution: { title: "警告", icon: CircleAlert },
};

/** 服务端渲染映射，交互只在链接、图片和复制按钮中水合。 */
export const markdownComponents: Components = {
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
  p: MarkdownParagraph,
  a: MarkdownAnchor,
  /**
   * 展示语言与行数，长代码在自身区域滚动。
   * @param props 高亮代码与语法树。
   * @returns 带工具栏的代码容器。
   */
  pre({ node, children }): ReactElement {
    const code = node?.children.find(
      (child) => child.type === "element" && child.tagName === "code",
    );
    const classes =
      code?.type === "element" ? String(code.properties.className || "") : "";
    const language = classes.match(/language-([\w+-]+)/)?.[1] || "text";
    const text = nodeText(children).replace(/\n$/, "");
    return (
      <div className="code-block">
        <div className="code-toolbar">
          <span>
            {language}
            <span className="code-line-count">
              {text.split("\n").length} 行
            </span>
          </span>
          <CopyButton text={text} />
        </div>
        <pre tabIndex={0} aria-label={`${language} 代码`}>
          {children}
        </pre>
      </div>
    );
  },
  /**
   * 提示块按语义选择主题，普通引用保持原有排版。
   * @param props 引用内容与提示块标记。
   * @returns 提示信息或普通引用。
   */
  blockquote({ node, children }): ReactElement {
    const kind = node?.properties["data-callout"];
    if (typeof kind !== "string" || !Object.hasOwn(notices, kind))
      return <blockquote>{children}</blockquote>;
    const notice = notices[kind as keyof typeof notices];
    return (
      <aside className={`callout callout-${kind}`}>
        <span className="callout-title">
          <notice.icon size={18} aria-hidden="true" />
          {notice.title}
        </span>
        {children}
      </aside>
    );
  },
  /**
   * 无效图片降级为说明，安全地址交给按需放大组件。
   * @param props 配图地址和说明。
   * @returns 正文配图或替代文字。
   */
  img({ src, alt, ...attributes }): ReactElement {
    const url = typeof src === "string" ? safeImageUrl(src) : undefined;
    if (
      url &&
      "data-linked" in attributes &&
      attributes["data-linked"] === true
    )
      return (
        <Image
          className="linked-markdown-image"
          src={url}
          alt={alt || ""}
          width={960}
          height={640}
          unoptimized
          referrerPolicy="no-referrer"
        />
      );
    return url ? (
      <ArticleImage src={url} alt={alt || ""} />
    ) : (
      <span>{alt}</span>
    );
  },
  /**
   * 宽表格保留独立滚动和键盘入口。
   * @param props 表格内容。
   * @returns 自身可滚动的表格。
   */
  table({ children }): ReactElement {
    return (
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="文章表格"
      >
        <table>{children}</table>
      </div>
    );
  },
};
