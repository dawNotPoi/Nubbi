import * as z from "zod/v4";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const NoteIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "note_id must be a 24-character MongoDB ID")
  .describe("Nubbi note ID, for example 665c8d7e6f00112233445566");

export const SourceSchema = z
  .enum(["user", "agent"])
  .describe("Filter by note origin; MCP may read both origins but write only agent notes");

export const StatusSchema = z
  .enum(["inbox", "active", "archived"])
  .describe("Filter by Nubbi note lifecycle status");

export const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE)
  .describe("Page size from 1 to 50; defaults to 20");

export const OffsetSchema = z
  .number()
  .int()
  .nonnegative()
  .default(0)
  .describe("Zero-based item offset for pagination");

export const IsoDateSchema = z
  .string()
  .datetime()
  .describe("UTC ISO 8601 timestamp, such as 2026-07-11T08:00:00Z");

export const ToolOutputSchema = z
  .object({
    ok: z.boolean(),
    summary: z.string(),
    data: z.unknown(),
    truncated: z.boolean(),
    guidance: z.string().nullable(),
  })
  .strict();
