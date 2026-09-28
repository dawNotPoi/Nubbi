"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useNearViewport } from "../hooks/use-near-viewport";
import { renderDiagram } from "../markdown/diagram";
import { CopyButton } from "./copy-button";

/**
 * 图表进入阅读范围后加载，主题切换直接使用 CSS，不触发重新绘制。
 * @param props 用于绘图、复制和无脚本回退的 Mermaid 源码。
 * @returns 带原文回退和横向滚动的示意图。
 */
export function ArticleDiagram({ source }: { source: string }): ReactElement {
  const { ref, visible } = useNearViewport();
  const [result, setResult] = useState<{ svg: string; failed: boolean }>({ svg: "", failed: false });
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void renderDiagram(source).then(
      (svg) => { if (!cancelled) setResult({ svg, failed: false }); },
      () => { if (!cancelled) setResult({ svg: "", failed: true }); },
    );
    return () => { cancelled = true; };
  }, [source, visible]);

  return (
    <div ref={ref} className="diagram-block">
      <div className="diagram-toolbar">
        <span>示意图</span>
        <CopyButton text={source} label="复制源码" />
      </div>
      {result.svg ? (
        <div className="diagram-canvas" role="region" aria-label="文章示意图，可横向滚动" tabIndex={0}
          dangerouslySetInnerHTML={{ __html: result.svg }} />
      ) : (
        <p className="diagram-status" role="status">
          {result.failed ? "图表暂时无法显示，可以展开源码阅读。" : "正在绘制示意图…"}
        </p>
      )}
      <details className="diagram-source" open={result.failed}>
        <summary>查看图表源码</summary>
        <pre tabIndex={0}><code>{source}</code></pre>
      </details>
    </div>
  );
}
