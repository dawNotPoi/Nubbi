import { getUser } from "@/lib/authUser";
import type { AuthRequest } from "@/middleware/common";
import { listFiles } from "@/services/fileManagement/list";
import { moveFileBatch, moveFileItem } from "@/services/fileManagement/move";
import {
  fileListQuerySchema,
  moveBatchSchema,
  moveFileSchema,
} from "@/services/fileManagement/schemas";
import type { Response } from "express";
import { successResponse } from "@/routes/utils";

export const listFilesController = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await getUser(req);
  const input = fileListQuerySchema.parse(req.query);
  successResponse(res, await listFiles(user.id, input), "query success");
};

export const moveFileController = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await getUser(req);
  const input = moveFileSchema.parse(req.body);
  successResponse(res, await moveFileItem(user.id, input), "移动成功");
};

export const moveFileBatchController = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await getUser(req);
  const input = moveBatchSchema.parse(req.body);
  const result = await moveFileBatch(user.id, input);
  const message = result.failed.length > 0 ? "批量移动完成，部分对象失败" : "批量移动成功";
  successResponse(res, result, message);
};
