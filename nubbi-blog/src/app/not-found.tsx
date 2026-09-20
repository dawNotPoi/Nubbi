import Link from "next/link";
import type { ReactElement } from "react";

/**
 * 对不存在、已撤回和不可公开的文章使用相同提示。
 * @returns 文章不可用页面。
 */
export default function NotFound(): ReactElement {
  return (
    <section className="page-message">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>这一页，暂时留白</h1>
      <p>文章可能已移走，或还没有公开。</p>
      <Link className="button" href="/blog">
        去读其他文章 →
      </Link>
    </section>
  );
}
