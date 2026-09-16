/** 链接分类决定导航行为、站点标识和是否可以请求预览。 */
export type LinkTarget = {
  href: string;
  url: string;
  kind: "external" | "internal" | "anchor" | "contact";
  host: string;
  label: string;
  source: "github" | "npm" | "blog" | "web";
};

/**
 * 统一处理相对地址、同站链接和协议，阻止混淆协议进入交互组件。
 * @param href Markdown 原始地址。
 * @param siteUrl 当前站点公开地址。
 * @returns 安全的导航目标，无法识别时返回 null。
 */
export function classifyLink(href: string, siteUrl: string): LinkTarget | null {
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;
  try {
    const url = new URL(href, siteUrl);
    if (url.username || url.password) return null;
    const base = { url: url.href, host: url.hostname, label: url.hostname };
    if (href.startsWith("#"))
      return { ...base, href, kind: "anchor", source: "blog" };
    if (["mailto:", "tel:"].includes(url.protocol))
      return { ...base, href: url.href, kind: "contact", source: "web" };
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.origin === new URL(siteUrl).origin)
      return {
        ...base,
        href: `${url.pathname}${url.search}${url.hash}`,
        kind: "internal",
        source: "blog",
        label: "站内文章",
      };
    const source =
      url.hostname === "github.com"
        ? "github"
        : ["npmjs.com", "www.npmjs.com"].includes(url.hostname)
          ? "npm"
          : "web";
    const path = url.pathname.split("/").filter(Boolean);
    const label =
      source === "github" && path.length >= 2
        ? path.slice(0, 2).join(" / ")
        : source === "npm" && path[0] === "package"
          ? path.slice(1).join("/")
          : url.hostname.replace(/^www\./, "");
    return { ...base, href: url.href, kind: "external", source, label };
  } catch {
    return null;
  }
}

/**
 * 仓库名和包名更适合紧凑预览，其他网页保留真实标题。
 * @param target 已识别的链接。
 * @param title 网页元数据标题。
 * @param fallback 作者提供的链接名称。
 * @returns 适合卡片与浮层的标题。
 */
export function previewTitle(
  target: LinkTarget,
  title?: string,
  fallback?: string,
): string {
  if (
    target.source === "github" &&
    /^\/[^/]+\/[^/]+\/?$/.test(new URL(target.url).pathname)
  )
    return target.label;
  if (target.source === "npm") return target.label;
  return title || fallback || target.label;
}
