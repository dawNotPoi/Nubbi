export type McpNoteResult = {
  id: string;
  title: string;
  author: string | null;
  parentId: string | null;
  hasChildren: boolean;
  source: "agent" | "user";
  status: string;
  published: boolean;
  tags: string[];
  date: string | null;
  contentRevision: number;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type McpContentNoteResult = McpNoteResult & {
  contentLength: number;
};

export type McpAffectedNoteResult = McpNoteResult & {
  affectedCount: number;
};

export type McpPaginationResult<T> = {
  items: T[];
  total: number;
  count: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};

export type McpNoteAncestor = {
  id: string;
  title: string;
};

export type McpNotePathResult = {
  ancestors: McpNoteAncestor[];
  path: string;
};

export type McpSearchNoteResult = McpNoteResult & {
  excerpt: string;
  path: string;
};

export type McpNoteDetailResult = McpNoteResult & {
  meta: unknown[];
  metaTruncated: boolean;
  ancestors: McpNoteAncestor[];
  path: string;
  content: string;
  contentOffset: number;
  contentLength: number;
  totalContentLength: number;
  hasMoreContent: boolean;
  nextContentOffset: number | null;
};

export type McpTrashNoteResult = McpNoteResult & {
  canRestore: boolean;
};
