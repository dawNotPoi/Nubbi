import { isRecord, readBoolean, readNumber, readString } from "../utils/records.js";

const noteLabel = (data: unknown): string => {
  const title = readString(data, "title") ?? "Untitled note";
  const id = readString(data, "id", "_id", "noteId");
  return id ? `“${title}” (${id})` : `“${title}”`;
};

export const summarizePage = (noun: string, data: unknown): string => {
  const count = readNumber(data, "count") ??
    (isRecord(data) && Array.isArray(data.items) ? data.items.length : 0);
  const total = readNumber(data, "total") ?? count;
  const offset = readNumber(data, "offset") ?? 0;
  const hasMore = readBoolean(data, "hasMore", "has_more") ?? false;
  const next = readNumber(data, "nextOffset", "next_offset");
  const continuation = hasMore
    ? ` More results exist; call again with offset=${next ?? offset + count}.`
    : "";
  return `Found ${count} ${noun} at offset ${offset} (${total} total).${continuation}`;
};

export const summarizeNote = (data: unknown): string => {
  const offset = readNumber(data, "contentOffset") ?? 0;
  const length = readNumber(data, "contentLength") ??
    (readString(data, "content")?.length ?? 0);
  const total = readNumber(data, "totalContentLength") ?? length;
  const next = readNumber(data, "nextContentOffset");
  const more = readBoolean(data, "hasMoreContent") ?? false;
  return `Read ${noteLabel(data)}: Markdown characters ${offset}-${offset + length} of ${total}.` +
    (more ? ` Continue with content_offset=${next ?? offset + length}.` : "");
};

/** 批量读取结果摘要：报告成功数量和缺失 ID */
export const summarizeBatchNotes = (data: unknown): string => {
  if (!isRecord(data)) return "Read 0 notes.";
  const items = Array.isArray(data.items) ? data.items : [];
  const missingIds = Array.isArray(data.missingIds) ? data.missingIds : [];
  const readCount = items.length;
  const summary = `Read ${readCount} notes in one batch.`;
  if (missingIds.length > 0) {
    return `${summary} Missing or inaccessible IDs: ${missingIds.join(", ")}.`;
  }
  return summary;
};

export const summarizeMutation = (verb: string, data: unknown): string => {
  const revision = readNumber(data, "contentRevision");
  const updatedAt = readString(data, "updatedAt");
  const version = revision !== undefined
    ? ` content_revision=${revision}.`
    : updatedAt
      ? ` updated_at=${updatedAt}.`
      : "";
  return `${verb} ${noteLabel(data)}.${version}`;
};
