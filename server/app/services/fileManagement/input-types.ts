import type { PaginationInput } from "@/common/pagination";

/** 文件分类类型 */
export type FileCategory =
  | "all"
  | "folder"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "other";

/** 文件列表查询输入参数 */
export type FileListInput = PaginationInput & {
  parentId: string | null;
  query: string;
  category: FileCategory;
  sortBy: "name" | "updatedAt";
  sortOrder: "asc" | "desc";
};

/** 移动目标类型 */
export type MoveTarget = {
  id: string;
  kind: "file" | "folder";
};

/** 单个移动操作的输入参数 */
export type MoveFileInput = {
  _id: string;
  kind: MoveTarget["kind"];
  targetFolderId: string | null;
};

/** 批量移动操作的输入参数 */
export type MoveBatchInput = {
  targets: MoveTarget[];
  targetFolderId: string | null;
};
