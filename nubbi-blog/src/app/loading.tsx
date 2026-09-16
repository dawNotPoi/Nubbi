import type { ReactElement } from "react";

/**
 * 导航等待时保留文章行结构，降低布局跳动。
 * @returns 可供屏幕阅读器识别的加载占位。
 */
export default function Loading(): ReactElement {
  return (
    <div className="loading-state" role="status" aria-label="正在加载文章">
      <span className="sr-only">正在加载文章…</span>
      <div className="skeleton skeleton-title" />
      {[0, 1, 2].map((key) => (
        <div className="skeleton-row" key={key} aria-hidden="true">
          <div className="skeleton skeleton-short" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ))}
    </div>
  );
}
