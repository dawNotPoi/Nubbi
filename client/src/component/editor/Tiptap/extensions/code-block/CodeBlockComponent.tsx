import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Select } from "antd";
import { ChevronDown, Copy } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import MermaidPreview from "./components/MermaidPreview";

import {
  CODE_BLOCK_LANGUAGES,
  CodeBlockOptions,
  normalizeCodeBlockLanguage,
} from ".";
import "./index.css";

const CodeBlockComponent: React.FC<NodeViewProps> = ({
  node,
  editor,
  updateAttributes,
  extension,
  getPos,
}) => {
  const [selectedLanguage, setSelectedLanguage] = React.useState(() => {
    return normalizeCodeBlockLanguage(node.attrs.language);
  });
  const [isExpanded, setIsExpanded] = useState(
    () => node.textContent.length === 0,
  );
  const options = extension.options as CodeBlockOptions;
  const isEditable = editor.isEditable;
  const source = node.textContent;
  const isMermaid = selectedLanguage === "mermaid";
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      const normalizedLanguage = normalizeCodeBlockLanguage(newLanguage);
      setSelectedLanguage(normalizedLanguage);
      updateAttributes({
        language: normalizedLanguage,
      });
    },
    [updateAttributes],
  );

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
  }, [node.textContent, options]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);

    if (!isEditable) return;

    requestAnimationFrame(() => {
      const position = getPos();
      if (typeof position === "number") {
        editor.chain().focus(position + 1).run();
      }
    });
  }, [editor, getPos, isEditable]);

  const handleToggleExpanded = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    handleExpand();
  }, [handleExpand, isExpanded]);

  const handleMermaidRenderError = useCallback(() => {
    setIsExpanded(true);
  }, []);

  return (
    <NodeViewWrapper
      className="blockCodeWrapper group rounded-xl pb-3"
      data-language={selectedLanguage}
      data-expanded={isExpanded ? "true" : "false"}
    >
      <header className="toolbar flex items-center px-2 py-2">
        <div className="flex-1"></div>
        <div className="codeToolbar flex h-[32px] items-center gap-1 overflow-hidden rounded-md p-0.5">
          {isEditable ? (
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
          ) : (
            <span className="px-2 text-xs uppercase tracking-wide text-neutral-400">
              {selectedLanguage}
            </span>
          )}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "收起代码" : "展开代码"}
            className="codeToolbarButton flex size-[28px] items-center justify-center overflow-hidden rounded-md p-1"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleToggleExpanded}
            title={isExpanded ? "收起代码" : "展开代码"}
          >
            <ChevronDown
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
          <button
            type="button"
            aria-label="复制代码"
            className="codeToolbarButton flex size-[28px] items-center justify-center overflow-hidden rounded-md p-1"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCopy}
          >
            <Copy size={16} />
          </button>
        </div>
      </header>
      {!isExpanded ? (
        <pre
          aria-label="展开并编辑代码"
          className="blockCodeContent blockCodeSummary"
          onClick={handleExpand}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleExpand();
            }
          }}
          role="button"
          tabIndex={0}
        >
          {firstLine || " "}
        </pre>
      ) : null}
      <pre
        className={`blockCodeContent overflow-x-auto ${isExpanded ? "" : "hidden"}`}
      >
        <NodeViewContent style={{ textWrap: "nowrap" }} />
      </pre>
      {isMermaid ? (
        <div className="px-4 pt-3">
          <MermaidPreview
            source={source}
            onRenderError={handleMermaidRenderError}
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
