import type { ReactElement, ReactNode, ComponentPropsWithoutRef } from "react";
import type { ExtraProps } from "react-markdown";
import { site } from "@/config/site";
import { classifyLink } from "../links/model";
import { nodeText, markLinkedImages } from "../markdown/nodes";
import { LinkCard } from "./link-card";
import { RichLink } from "./rich-link";

/**
 * 带图片的链接保留作者排版，不转换成纯摘要卡片。
 * @param node 链接语法节点。
 * @returns 是否包含图片。
 */
function containsImage(node: NonNullable<ExtraProps["node"]>): boolean {
  return node.children.some(
    (child) =>
      child.type === "element" &&
      (child.tagName === "img" || containsImage(child)),
  );
}

/**
 * 普通段落保持语义，只有独占段落的网页链接升级为卡片。
 * @param props 段落语法树和已渲染内容。
 * @returns 段落、配图容器或链接卡片。
 */
export function MarkdownParagraph({
  node,
  children,
}: ExtraProps & { children?: ReactNode }): ReactElement {
  const nodes = node?.children.filter(
    (child) => child.type !== "text" || child.value.trim(),
  );
  const only = nodes?.length === 1 ? nodes[0] : undefined;
  if (
    only?.type === "element" &&
    only.tagName === "a" &&
    !containsImage(only) &&
    typeof only.properties.href === "string"
  ) {
    const target = classifyLink(only.properties.href, site.url);
    const label = nodeText(children).trim();
    if (label && target && ["external", "internal"].includes(target.kind))
      return <LinkCard target={target} label={label} />;
  }
  if (only?.type === "element" && only.tagName === "img") {
    const caption =
      typeof only.properties.alt === "string" ? only.properties.alt : "";
    return (
      <figure className="article-figure">
        {children}
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    );
  }
  return <p>{children}</p>;
}

/**
 * 行内网页链接启用预览，锚点和邮件链接保持原生行为。
 * @param props 地址与链接文字。
 * @returns 安全链接或不可导航的原文。
 */
export function MarkdownAnchor({
  href,
  children,
  node,
  ...attributes
}: ExtraProps & ComponentPropsWithoutRef<"a">): ReactElement {
  const target = classifyLink(href || "", site.url);
  if (!target) return <span>{children}</span>;
  if (target.kind === "anchor" || target.kind === "contact")
    return (
      <a {...attributes} href={target.href}>
        {children}
      </a>
    );
  const label =
    nodeText(children).trim() || String(node?.properties.title || "");
  const content = markLinkedImages(children);
  if (!label)
    return (
      <a
        href={target.href}
        target={target.kind === "external" ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  return (
    <RichLink target={target} label={label}>
      {content}
    </RichLink>
  );
}
