import { Response } from "express";

export const successResponse = (
  res: Response,
  data: unknown = null,
  message = "success",
) => {
  res.json({
    code: 1,
    message,
    data,
  });
};

