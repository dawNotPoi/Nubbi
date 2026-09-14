import { Response } from "express";

export const successResponse = (res:Response, data:any=null,message="success") => {
  res.json({
    code: 1,
    message,
    data,
  });
};

