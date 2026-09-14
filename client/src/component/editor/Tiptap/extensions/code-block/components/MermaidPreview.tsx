import { useEffect, useState } from "react";

let mermaidInitialized = false;

const loadMermaid = async () => {
  const { default: mermaid } = await import("mermaid");

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
    mermaidInitialized = true;
  }

  return mermaid;
};

interface MermaidPreviewProps {
  fallback?: string | null;
  source: string;
}

const MermaidPreview = ({ fallback, source }: MermaidPreviewProps) => {
  const [svg, setSvg] = useState("");

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
    return fallback ? (
      <pre className="blockCodeContent overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-4">
        {fallback}
      </pre>
    ) : null;
  }

  return (
    <div
      className="mermaidPreview rounded-lg border border-stone-200 bg-stone-50 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidPreview;
