import type { Request, RequestHandler } from "express";
import { z } from "zod/v3";

/** 请求校验目标位置 */
type RequestPart = "body" | "query" | "params";

/** 各位置校验失败的提示文案 */
const validationMessages: Record<RequestPart, string> = {
  body: "数据验证失败",
  query: "查询参数验证失败",
  params: "路径参数验证失败",
};

/** 创建指定位置的 Zod 校验中间件：失败返回 400，成功把解析结果回填到请求对象 */
const createValidator = (
  schema: z.ZodSchema,
  part: RequestPart,
): RequestHandler =>
  (req, res, next): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      res.status(400).json({
        code: 0,
        message: validationMessages[part],
        errors: result.error.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
        })),
      });
      return;
    }

    if (part === "query") {
      req.query = result.data as Request["query"];
    } else if (part === "params") {
      req.params = result.data as Request["params"];
    } else {
      req.body = result.data;
    }
    next();
  };

/** 校验请求体（body） */
export const validate = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "body");

/** 校验查询参数（query） */
export const validateQuery = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "query");

/** 校验路径参数（params） */
export const validateParams = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "params");
