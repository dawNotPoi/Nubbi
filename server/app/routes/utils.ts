import type { Response } from "express";

/** 统一成功响应格式：{ code: 1, message, data } */
export const successResponse = (
  res: Response,
  data: unknown = null,
  message = "success",
): void => {
  res.json({
    code: 1,
    message,
    data,
  });
};

