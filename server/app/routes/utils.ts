import type { Response } from "express";

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

