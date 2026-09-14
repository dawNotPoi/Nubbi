import type { AuthRequest } from "@/middleware/common";
import { successResponse } from "@/routes/utils";
import {
  createFolderLegacy,
  getFoldersLegacy,
  listFilesLegacy,
  renameItemLegacy,
} from "@/services/fileManagement/legacy";
import type { Response } from "express";

export const listFilesLegacyController = async (
  req: AuthRequest,
  res: Response,
) => {
  successResponse(
    res,
    await listFilesLegacy(req.user?.id, req.body.parentId),
  );
};

export const createFolderLegacyController = async (
  req: AuthRequest,
  res: Response,
) => {
  const { name, parentId } = req.body;
  successResponse(
    res,
    await createFolderLegacy(req.user?.id, name, parentId),
  );
};

export const getFoldersLegacyController = async (
  req: AuthRequest,
  res: Response,
) => {
  successResponse(res, await getFoldersLegacy(req.user?.id));
};

export const renameItemLegacyController = async (
  req: AuthRequest,
  res: Response,
) => {
  const { _id, name, kind = "file" } = req.body;
  const nextName = String(name || "").trim();
  if (!_id || !nextName) {
    return res.status(400).json({ message: "对象 id 和名称不能为空" });
  }
  const result = await renameItemLegacy(req.user?.id, _id, nextName, kind);
  if (!result) {
    return res.status(404).json({
      message:
        kind === "folder"
          ? "文件夹不存在或无权操作"
          : "文件不存在或无权操作",
    });
  }
  successResponse(res, result);
};
