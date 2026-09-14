import { isRecord, readBoolean, readNumber, readString } from "./records.js";

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
