import { linkPreviewSchema, type LinkPreview } from "./contracts";
import type { LinkTarget } from "./model";

const cache = new Map<
  string,
  { expires: number; promise: Promise<LinkPreview> }
>();
const queue: Array<() => void> = [];
let active = 0;

/**
 * 浏览器侧最多同时请求四个摘要，避免链接密集文章挤占正文图片与导航带宽。
 * @param url 已归一化的目标地址。
 * @returns 接口校验后的预览内容。
 */
async function fetchQueued(url: string): Promise<LinkPreview> {
  if (active >= 4) {
    if (queue.length >= 40) throw new Error("预览队列繁忙");
    await new Promise<void>((resolve) => queue.push(resolve));
  } else {
    active++;
  }
  try {
    const response = await fetch(
      `/api/link-preview?${new URLSearchParams({ url })}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(6500),
      },
    );
    if (!response.ok) throw new Error("暂时无法获取预览");
    return linkPreviewSchema.parse(await response.json());
  } finally {
    const next = queue.shift();
    if (next) next();
    else active--;
  }
}

/**
 * 相同地址共享进行中的请求；只短期保留外站摘要，站内文章完成后立即移除。
 * @param target 链接分类结果。
 * @returns 当前预览请求，不写入持久化浏览器存储。
 */
export function requestLinkPreview(target: LinkTarget): Promise<LinkPreview> {
  const url = new URL(target.url);
  url.hash = "";
  const key = url.href;
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  if (cache.size >= 120) cache.delete(cache.keys().next().value || "");
  const promise = fetchQueued(key);
  const entry = { expires: Date.now() + 5 * 60_000, promise };
  cache.set(key, entry);
  void promise.then(
    (result) => {
      if (target.kind === "internal" && cache.get(key) === entry)
        cache.delete(key);
      if (!result.available) entry.expires = Date.now() + 30_000;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return promise;
}
