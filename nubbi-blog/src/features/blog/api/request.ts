import "server-only";
import { z } from "zod";
import { site } from "@/config/site";

/** Token 仅在请求模块读取，不加入可能传给页面的站点配置。 */
const apiToken = process.env.NUBBI_API_TOKEN?.trim();

/** 未配置凭证时与上游认证失败区分，便于本机预览显示空列表。 */
export class BlogConfigurationError extends Error {
  /** 创建不含凭证明文的配置错误。 */
  constructor() {
    super("博客尚未配置通用 API Token。");
    this.name = "BlogConfigurationError";
  }
}

/** 仅保留 HTTP 状态，不把上游地址、原始正文或内部错误暴露给读者。 */
export class BlogApiError extends Error {
  /**
   * 创建可识别的接口错误。
   * @param status 上游 HTTP 状态，连接失败时为 503。
   */
  constructor(readonly status: number) {
    super("文章服务暂时不可用，请稍后重试。");
    this.name = "BlogApiError";
  }
}

/**
 * 用账号通用 Token 读取现有笔记 API；返回值仍须经过公开过滤。
 * @param path 固定笔记路径及已编码的查询参数。
 * @param schema 对应接口的运行时响应契约。
 * @returns 通过契约校验的数据。
 */
export async function requestBlogData<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!apiToken) throw new BlogConfigurationError();
  try {
    const response = await fetch(`${site.apiUrl}/note/${path}`, {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", "X-API-Key": apiToken },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new BlogApiError(response.status);
    const body: unknown = await response.json();
    const parsed = z
      .object({ code: z.literal(1), data: schema })
      .safeParse(body);
    if (!parsed.success) throw new BlogApiError(502);
    return parsed.data.data;
  } catch (error) {
    if (error instanceof BlogApiError) throw error;
    // 非法 JSON 属于协议错误，不能按连接故障吞掉。
    if (error instanceof SyntaxError) throw new BlogApiError(502);
    throw new BlogApiError(503);
  }
}
