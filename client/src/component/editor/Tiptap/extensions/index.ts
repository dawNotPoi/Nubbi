import { imgToGitCloud } from "@/api/file";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { message } from "antd";
import { CodeBlock } from "./code-block";
import image from "./image";
import { ListIndentExtension } from "./list-indent";
import { SlashCommandExtension } from "./slash-command";
import { SmartSelectAllExtension } from "./smart-select-all";
import { PasteMarkdownExtension } from "./paste-markdown";
import { EDITOR_PLACEHOLDER } from "../constants";

export function createExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
    }),
    Markdown,
    CodeBlock.configure({
      onCopy: () => {
        message.success("复制成功");
      },
    }),
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: "dn-editor__table",
        },
        cellMinWidth: 120,
        lastColumnResizable: false,
        renderWrapper: true,
        resizable: true,
      },
      tableCell: {
        HTMLAttributes: {
          class: "dn-editor__table-cell",
        },
      },
      tableHeader: {
        HTMLAttributes: {
          class: "dn-editor__table-header",
        },
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "codeBlock") {
          return "";
        }
        return EDITOR_PLACEHOLDER;
      },
    }),
    image.configure({
      uploadHandler: async (file: File) => {
        const url = await imgToGitCloud(file);
        return url;
      },
    }),
    SlashCommandExtension,
    ListIndentExtension,
    SmartSelectAllExtension,
    PasteMarkdownExtension,
  ];
}
