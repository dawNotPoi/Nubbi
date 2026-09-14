import {
  ALLOWED_CHUNK_SIZES,
  fileUploadPolicy,
} from "@/lib/fileUploadPolicy";
import { z } from "zod";

const uploadIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "无效的 ID");

export const initUploadBodySchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((name) => !/[\\/\0]/.test(name), "文件名包含非法字符"),
    fileHash: z.string().regex(/^[a-f\d]{32}$/i, "无效的文件 hash"),
    totalSize: z.coerce
      .number()
      .int()
      .positive()
      .max(fileUploadPolicy.maxFileBytes),
    chunkSize: z.coerce
      .number()
      .int()
      .refine(
        (size) => ALLOWED_CHUNK_SIZES.includes(size),
        "无效的分片大小",
      ),
    totalChunks: z.coerce.number().int().positive().max(4096),
    folderId: uploadIdSchema.nullish(),
    mimeType: z.string().trim().max(255).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (Math.ceil(input.totalSize / input.chunkSize) !== input.totalChunks) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalChunks"],
        message: "分片数量与文件大小不匹配",
      });
    }
  });

export const chunkUploadBodySchema = z
  .object({
    uploadId: uploadIdSchema,
    chunkIndex: z.coerce.number().int().nonnegative(),
  })
  .strict();

export const mergeUploadBodySchema = z
  .object({
    uploadId: uploadIdSchema,
  })
  .strict();

export const uploadTaskParamsSchema = z
  .object({
    uploadId: uploadIdSchema,
  })
  .strict();

export type ChunkUploadBody = z.infer<typeof chunkUploadBodySchema>;
