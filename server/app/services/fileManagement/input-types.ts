import type { PaginationInput } from "@/common/pagination";

export type FileCategory =
  | "all"
  | "folder"
  | "document"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "other";

export type FileListInput = PaginationInput & {
  parentId: string | null;
  query: string;
  category: FileCategory;
  sortBy: "name" | "updatedAt";
  sortOrder: "asc" | "desc";
};

export type MoveTarget = {
  id: string;
  kind: "file" | "folder";
};

export type MoveFileInput = {
  _id: string;
  kind: MoveTarget["kind"];
  targetFolderId: string | null;
};

export type MoveBatchInput = {
  targets: MoveTarget[];
  targetFolderId: string | null;
};
