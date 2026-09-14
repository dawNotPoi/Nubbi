import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CHARACTER_LIMIT, STRUCTURED_DATA_LIMIT } from "../constants.js";
import { NubbiApiError } from "../client/api-client.js";
import { summarizeNote } from "../services/summaries.js";

interface LimitedData {
  data: unknown;
  truncated: boolean;
  contentAdjusted?: boolean;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const limitContentRecord = (data: unknown): LimitedData | null => {
  if (!isRecord(data) || typeof data.content !== "string") return null;
  const original = data.content;
  const offset = readNumber(data.contentOffset) ?? 0;
  const total = readNumber(data.totalContentLength) ?? offset + original.length;
  const empty = {
    ...data,
    content: "",
    contentLength: 0,
    totalContentLength: total,
  };
  const emptySize = JSON.stringify(empty).length;
  if (emptySize >= STRUCTURED_DATA_LIMIT - 256) return null;

  let content = original.slice(
    0,
    Math.max(0, STRUCTURED_DATA_LIMIT - emptySize - 256),
  );
  let adjusted: JsonRecord;
  do {
    const hasMore =
      content.length < original.length || data.hasMoreContent === true;
    adjusted = {
      ...data,
      content,
      contentLength: content.length,
      totalContentLength: total,
      hasMoreContent: hasMore,
      nextContentOffset: hasMore ? offset + content.length : null,
    };
    if (JSON.stringify(adjusted).length <= STRUCTURED_DATA_LIMIT) break;
    content = content.slice(0, Math.max(0, content.length - 256));
  } while (content.length > 0);

  return { data: adjusted, truncated: true, contentAdjusted: true };
};

const limitData = (data: unknown): LimitedData => {
  const serialized = JSON.stringify(data ?? null);
  if (serialized.length <= STRUCTURED_DATA_LIMIT) {
    return { data: data ?? null, truncated: false };
  }
  const contentResult = limitContentRecord(data);
  if (contentResult) return contentResult;
  let preview = serialized.slice(0, STRUCTURED_DATA_LIMIT - 200);
  let clipped = { preview, originalCharacters: serialized.length };
  while (JSON.stringify(clipped).length > STRUCTURED_DATA_LIMIT) {
    preview = preview.slice(0, Math.max(0, preview.length - 500));
    clipped = { preview, originalCharacters: serialized.length };
  }
  return {
    data: clipped,
    truncated: true,
  };
};

const clipText = (value: string): string =>
  value.length <= CHARACTER_LIMIT
    ? value
    : `${value.slice(0, CHARACTER_LIMIT - 80)}\n[Text clipped; narrow the query or paginate.]`;

const clipSummary = (value: string): string =>
  value.length <= 1_500 ? value : `${value.slice(0, 1_470)} [summary clipped]`;

export const toolSuccess = (
  summary: string,
  data: unknown,
  guidance: string | null = null,
): CallToolResult => {
  const limited = limitData(data);
  const safeSummary = clipSummary(
    limited.contentAdjusted ? summarizeNote(limited.data) : summary,
  );
  const finalGuidance = limited.truncated
    ? guidance ??
      "Structured data was clipped; continue from nextContentOffset when present, or narrow the query."
    : guidance;
  const text = clipText([safeSummary, finalGuidance].filter(Boolean).join(" "));
  return {
    content: [{ type: "text", text }],
    structuredContent: {
      ok: true,
      summary: safeSummary,
      data: limited.data,
      truncated: limited.truncated,
      guidance: finalGuidance,
    },
  };
};

const actionForStatus = (status: number): string => {
  switch (status) {
    case 400:
      return "Check the tool arguments against its schema, then retry.";
    case 401:
      return "Create or supply a valid, unexpired Nubbi MCP Agent token.";
    case 403:
      return "Only agent-authored notes are writable; read the note and choose an agent note.";
    case 404:
      return "List or search notes again and retry with a visible note_id.";
    case 409:
      return "Re-read the note, then retry with its latest revision or timestamp.";
    case 429:
      return "Wait before retrying; reduce page size or request frequency.";
    case 503:
    case 504:
      return "Check NUBBI_API_URL and server availability, then retry the read operation.";
    default:
      return "Inspect the message, refresh the note state, and retry only if safe.";
  }
};

export const toolError = (operation: string, error: unknown): CallToolResult => {
  const apiError = error instanceof NubbiApiError ? error : null;
  const message = apiError?.message ??
    (error instanceof Error ? error.message : "Unexpected MCP server error");
  const guidance = actionForStatus(apiError?.status ?? 500);
  const summary = clipSummary(`${operation} failed: ${message}`);
  const limited = limitData(apiError?.data ?? null);
  return {
    isError: true,
    content: [{ type: "text", text: clipText(`${summary} ${guidance}`) }],
    structuredContent: {
      ok: false,
      summary,
      data: limited.data,
      truncated: limited.truncated,
      guidance,
    },
  };
};
