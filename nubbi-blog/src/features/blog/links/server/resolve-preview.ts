import "server-only";
import { site } from "@/config/site";
import { getPost } from "../../api/posts";
import type { LinkPreview } from "../contracts";
import { classifyLink } from "../model";
import { fetchPreviewPage } from "./fetch-page";
import { parsePreviewPage } from "./parse-page";

const cache = new Map<
  string,
  { expires: number; value: Promise<LinkPreview> }
>();
let active = 0;
const unavailable: LinkPreview = {
  title: "",
  description: "",
  siteName: "",
  available: false,
};

/**
 * 只缓存外站纯文本摘要；站内笔记仍逐次校验发布条件，避免撤回后泄漏预览。
 * @param href 已通过接口校验的 HTTP(S) 地址。
 * @returns 网页摘要，无法获取时返回可降级状态。
 */
export async function resolveLinkPreview(href: string): Promise<LinkPreview> {
  const target = classifyLink(href, site.url);
  if (!target) return unavailable;
  if (target.kind === "internal") {
    const id = new URL(target.url).pathname.match(
      /^\/blog\/([a-f\d]{24})\/?$/i,
    )?.[1];
    if (!id) return unavailable;
    const post = await getPost(id);
    return post
      ? {
          title: post.title.slice(0, 180),
          description: post.excerpt.slice(0, 300),
          siteName: site.name.slice(0, 80),
          available: true,
        }
      : unavailable;
  }
  const url = new URL(target.url);
  url.hash = "";
  const key = url.href;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.value;
  if (active >= 8) return unavailable;
  active++;
  const value = fetchPreviewPage(key)
    .then(parsePreviewPage)
    .catch(() => unavailable)
    .finally(() => {
      active--;
    });
  if (cache.size >= 200) cache.delete(cache.keys().next().value || "");
  const entry = { expires: Date.now() + 15 * 60_000, value };
  cache.set(key, entry);
  void value.then((result) => {
    if (!result.available) entry.expires = Date.now() + 60_000;
  });
  return value;
}
