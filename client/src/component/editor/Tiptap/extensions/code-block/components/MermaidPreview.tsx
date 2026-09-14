import { useEffect, useState } from "react";

let mermaidInitialized = false;
const MERMAID_RENDER_DELAY_MS = 200;
const MERMAID_FONT_FAMILY =
  '"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

const loadMermaid = async () => {
  const { default: mermaid } = await import("mermaid");

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
      themeVariables: {
        fontFamily: MERMAID_FONT_FAMILY,
      },
    });
    mermaidInitialized = true;
  }

  return mermaid;
};

interface MermaidPreviewProps {
  onRenderError?: () => void;
  source: string;
}

type MermaidRenderStatus = "empty" | "loading" | "ready" | "error";

const MermaidPreview = ({ onRenderError, source }: MermaidPreviewProps) => {
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState<MermaidRenderStatus>("empty");

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!source.trim()) {
        setSvg("");
        setStatus("empty");
        return;
      }

      setStatus("loading");

      try {
        const mermaid = await loadMermaid();
        const parseResult = await mermaid.parse(source, {
          suppressErrors: true,
        });

        if (cancelled) return;

        if (parseResult === false) {
          setSvg("");
          setStatus("error");
          onRenderError?.();
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
          setStatus("error");
          onRenderError?.();
          return;
        }

        setSvg(result.svg);
        setStatus("ready");
      } catch (renderError) {
        if (cancelled) return;

        setSvg("");
        setStatus("error");
        onRenderError?.();
        console.warn("Mermaid render failed", renderError);
      }
    };

    const timeout = window.setTimeout(() => {
      void render();
    }, MERMAID_RENDER_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [onRenderError, source]);

  if (status === "empty") return null;

  if (status === "error") {
    return (
      <div
        className="mermaidPreviewStatus rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        Mermaid 图形无法渲染，请检查源码语法。
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        aria-label="Mermaid 图形正在渲染"
        className="mermaidPreviewStatus h-24 animate-pulse rounded-lg border border-stone-200 bg-stone-50"
        role="status"
      />
    );
  }

  return (
    <div
      aria-busy={status === "loading"}
      className="mermaidPreview rounded-lg border border-stone-200 bg-stone-50 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidPreview;
