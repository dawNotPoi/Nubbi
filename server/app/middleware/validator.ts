import type { Request, RequestHandler } from "express";
import { z } from "zod";

type RequestPart = "body" | "query" | "params";

const validationMessages: Record<RequestPart, string> = {
  body: "数据验证失败",
  query: "查询参数验证失败",
  params: "路径参数验证失败",
};

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

export const validate = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "body");

export const validateQuery = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "query");

export const validateParams = (schema: z.ZodSchema): RequestHandler =>
  createValidator(schema, "params");
