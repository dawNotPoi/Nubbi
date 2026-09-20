import "server-only";
import type { LookupAddress } from "node:dns";
import { z } from "zod";

const dnsResponse = z.object({
  Answer: z
    .array(z.object({ type: z.number(), data: z.string().max(253) }))
    .max(32)
    .optional(),
});

/**
 * 代理合成地址无法用于安全固定连接，使用固定公网端点获取真实 DNS 记录。
 * @param hostname 待解析的域名，不传递路径和查询内容。
 * @param signal 整个预览抓取共用的截止信号。
 * @returns 仍需经过公网地址校验的 DNS 结果。
 */
export async function resolveFallbackDns(
  hostname: string,
  signal: AbortSignal,
): Promise<LookupAddress[]> {
  const results = await Promise.all(
    ["A", "AAAA"].map(async (type) => {
      const query = new URLSearchParams({ name: hostname, type });
      const response = await fetch(`https://1.1.1.1/dns-query?${query}`, {
        headers: { Accept: "application/dns-json" },
        signal,
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("域名解析失败");
      const result = dnsResponse.parse(await response.json());
      return (result.Answer || [])
        .filter((record) => record.type === 1 || record.type === 28)
        .map((record) => ({
          address: record.data,
          family: record.type === 1 ? 4 : 6,
        }));
    }),
  );
  return results.flat();
}
