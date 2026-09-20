import "server-only";
import { z } from "zod";
import { site } from "@/config/site";

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
 * 从公开 API 获取并校验数据；每次请求重新检查发布状态。
 * @param path 固定博客路径及已编码的查询参数。
 * @param schema 对应接口的运行时响应契约。
 * @returns 通过契约校验的数据。
 */
export async function requestBlogData<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await fetch(`${site.apiUrl}/blog/${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
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
    throw new BlogApiError(503);
  }
}
