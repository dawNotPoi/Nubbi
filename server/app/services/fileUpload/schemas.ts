import { z } from "zod";
import { ALLOWED_CHUNK_SIZES, fileUploadConfig } from "./config";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "无效的 ID");

export const initUploadSchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((name) => !/[\\/\0]/.test(name), "文件名包含非法字符"),
    fileHash: z.string().regex(/^[a-f\d]{32}$/i, "无效的文件 hash"),
    totalSize: z.coerce.number().int().positive().max(fileUploadConfig.maxFileBytes),
    chunkSize: z.coerce
      .number()
      .int()
      .refine((size) => ALLOWED_CHUNK_SIZES.includes(size), "无效的分片大小"),
    totalChunks: z.coerce.number().int().positive().max(4096),
    folderId: objectIdSchema.nullish(),
    mimeType: z.string().trim().max(255).optional(),
  })
  .superRefine((input, context) => {
    if (Math.ceil(input.totalSize / input.chunkSize) !== input.totalChunks) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalChunks"],
        message: "分片数量与文件大小不匹配",
      });
    }
  });

export const uploadIdSchema = objectIdSchema;

export const chunkInputSchema = z.object({
  uploadId: objectIdSchema,
  chunkIndex: z.coerce.number().int().nonnegative(),
});

export type InitUploadInput = z.infer<typeof initUploadSchema>;

export const expectedChunkBytes = (
  totalSize: number,
  chunkSize: number,
  totalChunks: number,
  chunkIndex: number,
) => {
  if (chunkIndex < 0 || chunkIndex >= totalChunks) return null;
  if (chunkIndex < totalChunks - 1) return chunkSize;
  return totalSize - chunkSize * (totalChunks - 1);
};
