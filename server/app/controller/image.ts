import logger from "@/common/logger";
import image from "@/models/image";
import {
  enqueueImageCleanup,
  processImageCleanup,
} from "@/services/image/cleanup";
import { runAccountMutation } from "@/services/auth/account-mutation-guard";
import {
  deleteGitHubImage,
  uploadGitHubImage,
  type GitHubImageUpload,
} from "@/services/image/github-storage";

/** 图片创建输入参数 */
export type CreateImageInput = {
  ownerId: string;
  name: string;
  content: string;
  type?: string;
  provider?: "github";
  remotePath?: string;
  remoteSha?: string;
};

/** 图片业务结果类型 */
export type ImageResult = {
  _id: string;
  name: string;
  type?: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** 图片数据库记录的序列化源类型 */
type ImageResultSource = {
  _id: unknown;
  name: string;
  type?: string | null;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** 将数据库记录序列化为业务结果对象 */
const serializeImage = (item: ImageResultSource): ImageResult => ({
  _id: String(item._id),
  name: item.name,
  type: item.type || undefined,
  content: item.content,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

/** 创建图片记录 */
export const createImage = async (
  input: CreateImageInput,
): Promise<ImageResult> => serializeImage(await image.create(input));

/** 按 ID 和归属查询图片 */
export const findImage = async (
  id: string,
  ownerId: string,
): Promise<ImageResult | null> => {
  const item = await image.findOne({ _id: id, ownerId }).lean();
  return item ? serializeImage(item) : null;
};

/** 删除图片：清理 GitHub 远端文件，删除数据库记录 */
export const deleteImage = async (
  id: string,
  ownerId: string,
): Promise<ImageResult | null> => {
  const item = await image.findOne({ _id: id, ownerId });
  if (!item) return null;

  if (item.remotePath && item.remoteSha) {
    await enqueueImageCleanup(ownerId, [
      {
        remotePath: item.remotePath,
        remoteSha: item.remoteSha,
      },
    ]);
  }

  const deleted = await image.findOneAndDelete({ _id: id, ownerId });
  if (deleted?.remotePath && deleted.remoteSha) {
    void processImageCleanup(ownerId).catch((error: unknown) => {
      logger.warn("图片删除后的远端清理启动失败", { ownerId, error });
    });
  }
  return deleted ? serializeImage(deleted) : null;
};

/** 上传图片到 GitHub 并保存记录，失败时回滚远端文件（账号变更锁保护） */
export const uploadOwnedImageToGitHub = async (
  ownerId: string,
  file: Express.Multer.File,
): Promise<GitHubImageUpload> => runAccountMutation(ownerId, async () => {
  const uploaded = await uploadGitHubImage(file);
  try {
    await createImage({
      ownerId,
      name: file.originalname || "image",
      type: file.mimetype,
      content: uploaded.url,
      provider: "github",
      remotePath: uploaded.path,
      remoteSha: uploaded.sha,
    });
  } catch (error) {
    await enqueueImageCleanup(ownerId, [
      { remotePath: uploaded.path, remoteSha: uploaded.sha },
    ]).catch(async (cleanupError: unknown) => {
      logger.error("图片记录保存失败且无法登记远端清理任务", {
        ownerId,
        remotePath: uploaded.path,
        error: cleanupError,
      });
      await deleteGitHubImage(uploaded.path, uploaded.sha).catch(
        (deleteError: unknown) => {
          logger.error("无法回滚未登记的远端图片", {
            ownerId,
            remotePath: uploaded.path,
            error: deleteError,
          });
        },
      );
    });
    void processImageCleanup(ownerId).catch((cleanupError: unknown) => {
      logger.warn("图片记录保存失败后的远端清理启动失败", {
        ownerId,
        error: cleanupError,
      });
    });
    throw error;
  }
  return uploaded;
});
