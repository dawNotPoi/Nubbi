import {
  createElement,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import type { ExtraProps } from "react-markdown";

/**
 * 读取节点纯文本，供复制、可访问名称和链接识别共同使用。
 * @param children Markdown 节点树。
 * @returns 不带 HTML 的原始文字。
 */
export function nodeText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(children))
    return nodeText(children.props.children);
  return "";
}

/**
 * 标题以源位置生成唯一锚点，不受重复标题与中文编码影响。
 * @param level 标题层级。
 * @returns 服务端标题渲染组件。
 */
export function heading(
  level: number,
): (props: ExtraProps & ComponentPropsWithoutRef<"h2">) => ReactElement {
  /**
   * 使用同一锚点连接正文与目录。
   * @param props 标题内容和源位置。
   * @returns 可定位的标题。
   */
  return function Heading({ node, children, ...attributes }): ReactElement {
    const id =
      attributes.id ||
      `section-${node?.position?.start.offset ?? node?.position?.start.line ?? 0}`;
    return createElement(
      `h${level}`,
      { ...attributes, id },
      <a className="heading-anchor" href={`#${id}`}>
        {children}
      </a>,
    );
  };
}

/**
 * 图片作为链接内容时保留图片导航，避免在链接内部嵌套放大按钮。
 * @param children 链接中的富文本节点。
 * @returns 为图片渲染器标注导航上下文的节点树。
 */
export function markLinkedImages(children: ReactNode): ReactNode {
  if (Array.isArray(children)) return children.map(markLinkedImages);
  if (
    !isValidElement<{
      src?: string;
      children?: ReactNode;
      "data-linked"?: boolean;
    }>(children)
  )
    return children;
  if (typeof children.props.src === "string")
    return cloneElement(children, { "data-linked": true });
  if (children.props.children !== undefined)
    return cloneElement(children, {
      children: markLinkedImages(children.props.children),
    });
  return children;
}
