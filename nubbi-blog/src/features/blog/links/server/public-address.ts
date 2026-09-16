import "server-only";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import ipaddr from "ipaddr.js";
import { previewConfig } from "@/config/link-preview";
import { resolveFallbackDns } from "./fallback-dns";

/**
 * 只接受公网单播地址，识别映射地址并排除 NAT 和保留网段。
 * @param address DNS 返回的地址或 URL 中的 IP。
 * @returns 地址是否可用于外站预览请求。
 */
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  return ipaddr.process(address).range() === "unicast";
}

/**
 * 校验完整 DNS 结果并返回固定连接地址，避免校验后再次解析导致重绑定。
 * @param url 本次请求或重定向的完整地址。
 * @param signal 整个抓取过程共用的截止信号。
 * @returns 本次连接必须使用的公网 IP 与地址族。
 */
export async function resolvePublicAddress(
  url: URL,
  signal: AbortSignal,
): Promise<{ address: string; family: number }> {
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("预览地址不受支持");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname.includes(".") && !hostname.includes(":"))
    throw new Error("预览地址不可访问");
  signal.throwIfAborted();
  let addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    /** 使 DNS 等待也受总超时约束。 */
    const abort = (): void => reject(new Error("解析超时"));
    signal.addEventListener("abort", abort, { once: true });
    lookup(hostname, { all: true })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
  signal.throwIfAborted();
  if (
    !ipaddr.isValid(hostname) &&
    addresses.length &&
    addresses.every(({ address }) => /^198\.(18|19)\./.test(address)) &&
    previewConfig.dnsFallback === "cloudflare"
  )
    addresses = await resolveFallbackDns(hostname, signal);
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicAddress(address))
  )
    throw new Error("预览地址不可访问");
  return addresses.find(({ family }) => family === 4) || addresses[0];
}
