import "server-only";
import { Parser } from "htmlparser2";
import type { LinkPreview } from "../contracts";

/**
 * 解析网页头部文本，不执行内容，也不把外站图片或脚本注入阅读页。
 * @param html 已限制长度的 HTML。
 * @returns 经过长度约束的标题、摘要与来源信息。
 */
export function parsePreviewPage(html: string): LinkPreview {
  const meta = new Map<string, string>();
  let inTitle = false;
  let inHead = true;
  let title = "";
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (name === "body") inHead = false;
        if (!inHead) return;
        if (name === "title") inTitle = true;
        const key = (
          attributes.property ||
          attributes.name ||
          ""
        ).toLowerCase();
        if (name === "meta" && attributes.content && !meta.has(key))
          meta.set(key, attributes.content);
      },
      ontext(text) {
        if (inTitle && inHead) title += text;
      },
      onclosetag(name) {
        if (name === "title") inTitle = false;
        if (name === "head") inHead = false;
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  /** 清理不可见控制字符并压缩空白，保持卡片尺寸稳定。 */
  const clean = (value: string, limit: number): string =>
    value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  const resolvedTitle = clean(
    meta.get("og:title") || meta.get("twitter:title") || title,
    180,
  );
  return {
    title: resolvedTitle,
    description: clean(
      meta.get("og:description") ||
        meta.get("description") ||
        meta.get("twitter:description") ||
        "",
      300,
    ),
    siteName: clean(meta.get("og:site_name") || "", 80),
    available: Boolean(resolvedTitle),
  };
}
