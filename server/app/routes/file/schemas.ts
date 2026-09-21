import { paginationQuerySchema } from "@/common/pagination";
import { z } from "zod/v3";

export const fileObjectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId")
  .transform((value) => value.toLowerCase());

const normalizeRootFolder = (value: unknown): unknown => {
  if (
    value === null ||
    value === "" ||
    value === "root" ||
    value === "null"
  ) {
    return null;
  }
  return value;
};

const rootFolderSchema = z.preprocess(
  normalizeRootFolder,
  fileObjectIdSchema.nullable(),
);

export const fileListQuerySchema = paginationQuerySchema.extend({
  parentId: rootFolderSchema.default(null),
  query: z.string().trim().max(200).default(""),
  category: z
    .enum([
      "all",
      "folder",
      "document",
      "image",
      "video",
      "audio",
      "archive",
      "other",
    ])
    .default("all"),
  sortBy: z.enum(["name", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const moveTargetSchema = z.object({
  id: fileObjectIdSchema,
  kind: z.enum(["file", "folder"]),
});

export const moveFileSchema = z.object({
  _id: fileObjectIdSchema,
  kind: z.enum(["file", "folder"]).default("file"),
  targetFolderId: rootFolderSchema,
});

export const moveBatchSchema = z.object({
  targets: z.array(moveTargetSchema).min(1).max(100),
  targetFolderId: rootFolderSchema,
});

export const legacyListSchema = z.object({
  parentId: rootFolderSchema.default(null),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: rootFolderSchema.default(null),
});

export const renameFileSchema = z.object({
  _id: fileObjectIdSchema,
  name: z.string().trim().min(1).max(255),
  kind: z.enum(["file", "folder"]).default("file"),
});

export const deleteFileSchema = z.object({
  fileId: fileObjectIdSchema,
  kind: z.enum(["file", "folder"]).default("file"),
});

export const deleteBatchSchema = z
  .object({
    fileIds: z.array(fileObjectIdSchema).max(100).optional(),
    targets: z.array(moveTargetSchema).max(100).optional(),
  })
  .refine(
    ({ fileIds, targets }) => Boolean(fileIds?.length || targets?.length),
    "targets 不能为空",
  )
  .refine(
    ({ fileIds, targets }) =>
      (fileIds?.length ?? 0) + (targets?.length ?? 0) <= 100,
    "批量删除一次最多处理 100 个对象",
  );

export const fileIdParamsSchema = z.object({
  fileId: fileObjectIdSchema,
});
