"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { usePageRecovery } from "@/features/blog/hooks/use-page-recovery";

/**
 * 将服务不可用与空文章列表区分，允许读者重新发起请求。
 * @returns 可恢复的页面错误提示。
 */
export default function ErrorPage(): ReactElement {
  const { recovering, retry } = usePageRecovery();
  return (
    <section className="page-message" role="alert">
      <span className="eyebrow">稍等片刻</span>
      <h1>文章暂时没能加载</h1>
      <p>连接遇到了一点问题，请稍后再试。</p>
      <div className="message-actions">
        <button className="button" onClick={retry} disabled={recovering}>
          <RefreshCw size={16} aria-hidden="true" />
          {recovering ? "正在重试…" : "重新加载"}
        </button>
        <Link href="/">返回首页</Link>
      </div>
    </section>
  );
}
