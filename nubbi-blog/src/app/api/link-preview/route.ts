import { z } from "zod";
import { resolveLinkPreview } from "@/features/blog/links/server/resolve-preview";

const querySchema = z.object({
  url: z
    .url()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), "仅支持网页地址"),
});

/** 元数据读取使用 Node 网络接口，以固定已校验的公网连接地址。 */
export const runtime = "nodejs";
/** 站内预览每次重新验证发布状态，禁止响应缓存。 */
export const dynamic = "force-dynamic";

/**
 * 为阅读页提供受约束的链接元数据，不暴露上游响应或内部错误信息。
 * @param request 含 url 查询参数的同源预览请求。
 * @returns 纯文本摘要或参数错误响应。
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = querySchema.safeParse({
    url: new URL(request.url).searchParams.get("url"),
  });
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!parsed.success)
    return Response.json(
      { message: "链接地址不正确" },
      { status: 400, headers },
    );
  try {
    return Response.json(await resolveLinkPreview(parsed.data.url), {
      headers,
    });
  } catch {
    return Response.json(
      { title: "", description: "", siteName: "", available: false },
      { headers },
    );
  }
}
