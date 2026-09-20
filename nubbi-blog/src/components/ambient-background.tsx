import type { ReactElement } from "react";

/**
 * 少量装饰光点完全由 CSS 驱动，避免持续监听鼠标或触发 React 更新。
 * @returns 不参与交互和读屏的背景层。
 */
export function AmbientBackground(): ReactElement {
  return <div className="ambient-background" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>;
}
