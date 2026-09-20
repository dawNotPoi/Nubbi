import type { ReactElement } from "react";

/**
 * 文章切换时保持窄阅读栏的尺寸。
 * @returns 正文加载占位。
 */
export default function ArticleLoading(): ReactElement {
  return (
    <div className="reading-layout" role="status" aria-label="正在加载正文">
      <div className="reading-article loading-state">
        <span className="sr-only">正在加载正文…</span>
        <div className="skeleton skeleton-title" />
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="skeleton-row" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
