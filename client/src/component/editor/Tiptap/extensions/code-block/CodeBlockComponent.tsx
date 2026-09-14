import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Select } from "antd";
import { Copy } from "lucide-react";
import React, { useCallback, useEffect } from "react";

import {
  CODE_BLOCK_LANGUAGES,
  CodeBlockOptions,
  normalizeCodeBlockLanguage,
} from ".";
import "./index.css";

const CodeBlockComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  extension,
}) => {
  const [selectedLanguage, setSelectedLanguage] = React.useState(() => {
    return normalizeCodeBlockLanguage(node.attrs.language);
  });
  const options = extension.options as CodeBlockOptions;

  const handleLanguageChange = useCallback((newLanguage: string) => {
    const normalizedLanguage = normalizeCodeBlockLanguage(newLanguage);
    setSelectedLanguage(normalizedLanguage);
    updateAttributes({
      language: normalizedLanguage,
    });
  }, []);

  useEffect(() => {
    setSelectedLanguage(normalizeCodeBlockLanguage(node.attrs.language));
  }, [node.attrs.language]);

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
    <NodeViewWrapper
      className="blockCodeWrapper group my-3 rounded-xl pb-3"
      data-language={selectedLanguage}
    >
      <header className="toolbar flex items-center px-2 py-2">
        <div className="flex-1"></div>
        <div className="codeToolbar flex h-[32px] items-center gap-1 overflow-hidden rounded-md p-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
          <Select
            variant="borderless"
            className="codeToolbarSelect h-[28px] overflow-hidden rounded-md text-[13px]"
            value={selectedLanguage}
            onChange={(value) => {
              handleLanguageChange(value);
            }}
          >
            {CODE_BLOCK_LANGUAGES.map((lang) => (
              <Select.Option key={lang.value} value={lang.value}>
                {lang.label}
              </Select.Option>
            ))}
          </Select>
          <button
            className="codeToolbarButton flex size-[28px] items-center justify-center overflow-hidden rounded-md p-1"
            onClick={handleCopy}
          >
            <Copy size={16} />
          </button>
        </div>
      </header>
      <pre className="blockCodeContent overflow-x-auto">
        <NodeViewContent style={{ textWrap: "nowrap" }} />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
