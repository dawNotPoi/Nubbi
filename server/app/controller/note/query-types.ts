import type { PaginationResult } from "@/common/pagination";
import type { NoteDocument, NoteEntity } from "@/models/note";
import type { FlattenMaps, Types } from "mongoose";

export type NotePathItem = {
  _id: string;
  title: string;
};

export type NoteListDocument = Omit<NoteDocument, "content">;

export type NoteSearchItem = Omit<
  FlattenMaps<NoteEntity>,
  "content"
> & {
  _id: Types.ObjectId;
  pathLabel: string;
};

export type NotePaginationResult = PaginationResult<NoteListDocument>;
