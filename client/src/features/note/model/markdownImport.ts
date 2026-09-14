const MARKDOWN_FILE_PATTERN = /\.(md|markdown)$/i;

import type { MetaEntry } from "@/api/note";

export type MarkdownImportDraft = {
  content: string;
  meta: MetaEntry[];
  tags: string[];
  title: string;
};

export const isMarkdownFile = (file: File) =>
  MARKDOWN_FILE_PATTERN.test(file.name);

const stripMarkdownExtension = (fileName: string) =>
  fileName.replace(MARKDOWN_FILE_PATTERN, "");

const stripWrappingQuotes = (value: string) =>
  value.replace(/^["']|["']$/g, "").trim();

const normalizeTitle = (value?: string) => {
  const title = stripWrappingQuotes(value ?? "");
  return title || "";
};

const parseFrontmatter = (text: string) => {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return { markdown: text, meta: {} as Record<string, string> };

  const meta = match[1].split(/\r?\n/).reduce<Record<string, string>>(
    (result, line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return result;

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && value) result[key] = stripWrappingQuotes(value);
      return result;
    },
    {},
  );

  return { markdown: text.slice(match[0].length), meta };
};

const getFirstHeadingTitle = (markdown: string) => {
  const line = markdown
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith("# "));
  if (!line) return "";

  return normalizeTitle(line.replace(/^#\s+/, "").replace(/\s+#*$/, ""));
};

const removeLeadingTitleHeading = (markdown: string, title: string) => {
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) return "";

  const firstLine = lines[firstContentIndex].trim();
  const headingTitle = getFirstHeadingTitle(firstLine);
  if (headingTitle && headingTitle === title) {
    lines.splice(firstContentIndex, 1);
  }

  return lines.join("\n").trim();
};

const parseTags = (value?: string) => {
  if (!value) return [];

  return value
    .replace(/^\[|\]$/g, "")
    .split(/[,，]/)
    .map((tag) => stripWrappingQuotes(tag.trim()))
    .filter(Boolean);
};

export const parseMarkdownImport = (
  fileName: string,
  text: string,
): MarkdownImportDraft => {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const { markdown, meta } = parseFrontmatter(normalizedText);
  const title =
    normalizeTitle(meta.title) ||
    getFirstHeadingTitle(markdown) ||
    stripMarkdownExtension(fileName) ||
    "未命名文档";

  return {
    content: removeLeadingTitleHeading(markdown, title),
    meta: Object.entries({
      ...meta,
      importedFrom: fileName,
      type: meta.type || "markdown",
    })
      .filter(([key]) => key !== "title" && key !== "status" && key !== "tags")
      .map(([key, value]) => ({ key, value, type: "text" })),
    tags: parseTags(meta.tags),
    title,
  };
};
