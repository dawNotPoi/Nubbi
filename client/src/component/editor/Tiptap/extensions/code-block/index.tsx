// CustomCodeBlock.ts

import CodeBlockLowlight, {
  CodeBlockLowlightOptions,
} from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { all, createLowlight } from "lowlight";
import CodeBlockComponent from "./CodeBlockComponent";
const lowlight = createLowlight(all);
export interface CodeBlockOptions extends CodeBlockLowlightOptions {
  onCopy?: (content: string) => void;
}

// 拓展codeblock
export const CodeBlock = CodeBlockLowlight.extend<CodeBlockOptions>({
  selectable: true,
  draggable: true,
  addOptions() {
    return {
      ...CodeBlockLowlight.options,
      onCopy: () => {},
    };
  },
  // 覆盖 addAttributes，确保 language 属性正确，并支持 TypeScript 类型推断
  //md导出
  renderMarkdown: (node) => {
    const language = node.attrs?.language || "";
    // node.textContent 会自动提取代码块内部的纯文本，不带 HTML 标签
    const content = node.content?.[0].text || "";
    const result = `\`\`\`${language}\n${content}\n\`\`\``;
    // 直接返回拼接后的字符串
    // 注意：前后留空行是为了符合标准的段落分隔规范，解决你说的换行问题
    return result;
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  enableTabIndentation: true,
});
