import CodeBlockLowlight, {
  CodeBlockLowlightOptions,
} from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import CodeBlockComponent from "./CodeBlockComponent";

const lowlight = createLowlight(common);

lowlight.registerAlias({
  html: "xml",
  js: "javascript",
  ts: "typescript",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
});

export interface CodeBlockOptions extends CodeBlockLowlightOptions {
  onCopy?: (content: string) => void;
  showMermaidSourceWhenReadOnly?: boolean;
}

export const CODE_BLOCK_LANGUAGES = [
  { label: "Plain Text", value: "plaintext" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "HTML", value: "xml" },
  { label: "CSS", value: "css" },
  { label: "JSON", value: "json" },
  { label: "Bash", value: "bash" },
  { label: "Markdown", value: "markdown" },
  { label: "Mermaid", value: "mermaid" },
] as const;

export const normalizeCodeBlockLanguage = (language?: string | null) => {
  if (!language || language === "auto") {
    return "plaintext";
  }

  const normalized = language.toLowerCase();

  if (normalized === "html") return "xml";
  if (normalized === "js") return "javascript";
  if (normalized === "ts") return "typescript";
  if (normalized === "shell" || normalized === "sh" || normalized === "zsh") {
    return "bash";
  }
  if (normalized === "yml") return "yaml";
  if (normalized === "mmd") return "mermaid";

  return normalized;
};

export const CodeBlock = CodeBlockLowlight.extend<CodeBlockOptions>({
  selectable: true,
  draggable: true,
  addOptions() {
    return {
      ...CodeBlockLowlight.options,
      onCopy: () => {},
      showMermaidSourceWhenReadOnly: false,
    };
  },
  renderMarkdown: (node) => {
    const language = normalizeCodeBlockLanguage(node.attrs?.language);
    const content =
      node.content
        ?.map((child) => child.text ?? "")
        .join("") ?? "";
    const infoString = language === "plaintext" ? "" : language;
    const longestBacktickRun = Math.max(
      2,
      ...Array.from(content.matchAll(/`+/g), (match) => match[0].length),
    );
    const fence = "`".repeat(longestBacktickRun + 1);

    return `${fence}${infoString}\n${content}\n${fence}`;
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  enableTabIndentation: true,
});
