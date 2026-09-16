import "server-only";
import { z } from "zod";

const environment = z
  .object({
    BLOG_PREVIEW_DNS_FALLBACK: z
      .enum(["cloudflare", "off"])
      .default("cloudflare"),
  })
  .parse(process.env);

/** 仅在代理返回合成地址时使用固定公网 DNS 服务，可显式关闭。 */
export const previewConfig = {
  dnsFallback: environment.BLOG_PREVIEW_DNS_FALLBACK,
};
