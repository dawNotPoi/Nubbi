import "server-only";
import { z } from "zod";

const httpUrl = z
  .url()
  .refine((value) => /^https?:\/\//.test(value), "地址必须使用 HTTP 或 HTTPS");
const environment = z
  .object({
    NUBBI_API_URL: httpUrl.default("http://localhost:4000"),
    BLOG_SITE_URL: httpUrl.default("http://localhost:3002"),
    BLOG_SITE_NAME: z.string().trim().min(1).default("Nubbi Blog"),
    BLOG_SITE_DESCRIPTION: z
      .string()
      .default("记录思考，分享日常。在文字里，遇见新的自己。"),
    NUBBI_EDITOR_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      httpUrl.optional(),
    ),
  })
  .parse(process.env);

/** 公开站点配置与服务端 API 地址，禁止导入客户端组件。 */
export const site = {
  name: environment.BLOG_SITE_NAME,
  description: environment.BLOG_SITE_DESCRIPTION,
  url: environment.BLOG_SITE_URL,
  apiUrl: environment.NUBBI_API_URL.replace(/\/+$/, ""),
  editorUrl: environment.NUBBI_EDITOR_URL,
};
