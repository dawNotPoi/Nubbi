import { newNote } from "@/api/note";
import {
  isMarkdownFile,
  parseMarkdownImport,
} from "@/features/note/model/markdownImport";
import { createNoteAtom } from "@/store/atom/noteAtom";
import { message } from "antd";
import { useAtomValue } from "jotai";
import { useState } from "react";

type MessageApi = ReturnType<typeof message.useMessage>[0];

type UseMarkdownNoteImportOptions = {
  messageApi: MessageApi;
  owner: string;
  refetch: () => Promise<unknown>;
};

export const useMarkdownNoteImport = ({
  messageApi,
  owner,
  refetch,
}: UseMarkdownNoteImportOptions) => {
  const { mutateAsync: createNote } = useAtomValue(createNoteAtom);
  const [importingMarkdown, setImportingMarkdown] = useState(false);

  const importMarkdownFiles = async (files: File[]) => {
    if (!owner) return;

    const markdownFiles = files.filter(isMarkdownFile);
    const ignoredCount = files.length - markdownFiles.length;

    if (markdownFiles.length === 0) {
      messageApi.warning("请选择 .md 或 .markdown 文件");
      return;
    }
    if (ignoredCount > 0) {
      messageApi.warning(`已忽略 ${ignoredCount} 个非 Markdown 文件`);
    }

    setImportingMarkdown(true);
    try {
      const settledResults = await Promise.allSettled(
        markdownFiles.map(async (file) => {
          const text = await file.text();
          const draft = parseMarkdownImport(file.name, text);
          const note = newNote({
            content: draft.content,
            meta: draft.meta,
            parentId: null,
            tags: draft.tags,
            title: draft.title,
          });

          await createNote({ note, owner });
        }),
      );

      const importedCount = settledResults.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = settledResults.length - importedCount;

      if (importedCount > 0) {
        messageApi.success(`已导入 ${importedCount} 篇 Markdown`);
        await refetch();
      }
      if (failedCount > 0) {
        messageApi.error(`${failedCount} 篇导入失败，请稍后重试`);
      }
    } finally {
      setImportingMarkdown(false);
    }
  };

  return { importMarkdownFiles, importingMarkdown };
};

