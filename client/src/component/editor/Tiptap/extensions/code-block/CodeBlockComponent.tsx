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

let mermaidInitialized = false;

const loadMermaid = async () => {
  const { default: mermaid } = await import("mermaid");

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
    });
    mermaidInitialized = true;
  }

  return mermaid;
};

const MermaidPreview = ({ source }: { source: string }) => {
  const [svg, setSvg] = React.useState("");

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!source.trim()) {
        setSvg("");
        return;
      }

      try {
        const mermaid = await loadMermaid();
        const parseResult = await mermaid.parse(source, {
          suppressErrors: true,
        });

        if (cancelled) return;

        if (parseResult === false) {
          setSvg("");
          return;
        }

        const id = `mermaid-preview-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, source);

        if (cancelled) return;

        if (
          !result.svg.includes("<svg") ||
          /syntax error|mermaid version/i.test(result.svg)
        ) {
          setSvg("");
          return;
        }

        setSvg(result.svg);
      } catch (renderError) {
        if (cancelled) return;

        setSvg("");
        console.warn("Mermaid render failed", renderError);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!svg) {
    return null;
  }

  return (
    <div
      className="mermaidPreview rounded-lg border border-stone-200 bg-stone-50 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const CodeBlockComponent: React.FC<NodeViewProps> = ({
  node,
  editor,
  updateAttributes,
  extension,
}) => {
  const [selectedLanguage, setSelectedLanguage] = React.useState(() => {
    return normalizeCodeBlockLanguage(node.attrs.language);
  });
  const options = extension.options as CodeBlockOptions;
  const isEditable = editor.isEditable;
  const source = node.textContent;
  const shouldShowMermaidSource =
    selectedLanguage !== "mermaid" ||
    isEditable ||
    !!options.showMermaidSourceWhenReadOnly;

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

  return (
    <NodeViewWrapper
      className="blockCodeWrapper group my-3 rounded-xl pb-3"
      data-language={selectedLanguage}
    >
      <header className="toolbar flex items-center px-2 py-2">
        <div className="flex-1"></div>
        <div className="codeToolbar flex h-[32px] items-center gap-1 overflow-hidden rounded-md p-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
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
            className="codeToolbarButton flex size-[28px] items-center justify-center overflow-hidden rounded-md p-1"
            onClick={handleCopy}
          >
            <Copy size={16} />
          </button>
        </div>
      </header>
      {shouldShowMermaidSource ? (
        <pre className="blockCodeContent overflow-x-auto">
          <NodeViewContent style={{ textWrap: "nowrap" }} />
        </pre>
      ) : (
        <div className="hidden">
          <NodeViewContent />
        </div>
      )}
      {selectedLanguage === "mermaid" ? (
        <div className="px-4 pt-3">
          <MermaidPreview source={source} />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
