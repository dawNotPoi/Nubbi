export type MetaFieldType = "text" | "number" | "url" | "date" | "select" | "multi-select";

export type MetaFieldDefinition = {
  key: string;
  label: string;
  type: MetaFieldType;
  options?: string[];
};

export const STANDARD_META_FIELDS: MetaFieldDefinition[] = [
  { key: "source_url", label: "Source URL", type: "url" },
  { key: "language", label: "Language", type: "text" },
  { key: "slug", label: "Slug", type: "text" },
  { key: "excerpt", label: "Excerpt", type: "text" },
  { key: "duration_min", label: "Duration", type: "number" },
  { key: "channel", label: "Channel", type: "text" },
  { key: "isbn", label: "ISBN", type: "text" },
  { key: "publisher", label: "Publisher", type: "text" },
  { key: "publication_year", label: "Publication Year", type: "number" },
  { key: "page_count", label: "Page Count", type: "number" },
];
