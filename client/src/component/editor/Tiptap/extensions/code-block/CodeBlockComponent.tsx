import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Select } from "antd";
import { Copy } from "lucide-react";
import React, { useCallback } from "react";

import { CodeBlockOptions } from ".";
import "./index.css";
// 定义支持的语言列表
const languages = [
  { label: "Auto", value: "auto" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
];

// 使用 NodeViewProps 泛型，并传入 CodeBlockAttributes
const CodeBlockComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  extension,
}) => {
  const [selectedLanguage, setSelectedLanguage] = React.useState(() => {
    return node.attrs.language || "javascript";
  });
  const options = extension.options as CodeBlockOptions;
  //处理语言选择
  const handleLanguageChange = useCallback((newLanguage: string) => {
    // V3 的 updateAttributes 传递到 NodeViewProps 中
    setSelectedLanguage(newLanguage);
    updateAttributes({
      language: newLanguage,
    });
  }, []);

  //进行复制处理
  const handleCopy = useCallback(() => {
    const codeContent = node.textContent;
    if (codeContent) {
      navigator.clipboard
        .writeText(codeContent)
        .then(() => {
          options.onCopy?.(codeContent);
        })
        .catch((err) => {
          console.error("Copy failed:", err);
        });
    }
  }, [node.textContent]);

  return (
    // data-language 用于 CSS 高亮或样式选择
    <NodeViewWrapper
      className="bg-[rgba(249,248,247,0.8)] blockCodeWrapper group my-2 rounded-md pb-4"
      data-language={selectedLanguage}
    >
      <header className="flex toolbar items-center px-1 py-1 ">
        <div className="flex-1"></div>
        {/* 1. 代码语言选择下拉框 */}
        <div className="opacity-0 h-[30px] p-0.5  text-gray-500 flex items-center gap-1 border rounded-md overflow-hidde focus-within:opacity-100 group-hover:opacity-100 bg-white">
          <Select
            variant="borderless"
            className="h-[26px] rounded-md overflow-hidden text-[14px] hover:bg-gray-100"
            value={selectedLanguage}
            onChange={(value) => {
              handleLanguageChange(value);
            }}
          >
            {languages.map((lang) => (
              <Select.Option key={lang.value} value={lang.value}>
                {lang.label}
              </Select.Option>
            ))}
          </Select>
          {/* 2. 复制按钮 */}
          <button
            className="p-1 size-[26px] flex items-center justify-center rounded-sm overflow-hidden hover:bg-gray-100 "
            onClick={handleCopy}
          >
            {<Copy size={16} />}
          </button>
        </div>
      </header>
      {/* 3. 原始代码内容区域 */}
      <pre className="mx-6 overflow-x-auto blockCodeContent">
        <NodeViewContent style={{ textWrap: "nowrap" }} />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
