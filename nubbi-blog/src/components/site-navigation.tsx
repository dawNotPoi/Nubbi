"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

/**
 * 只提供首页与文集入口，文章详情归属于文集。
 * @returns 显示当前位置的主导航。
 */
export function SiteNavigation(): ReactElement {
  const pathname = usePathname();
  return (
    <nav className="header-nav" aria-label="主导航">
      <Link href="/" transitionTypes={["nav-back"]} aria-current={pathname === "/" ? "page" : undefined}>首页</Link>
      <Link href="/blog" transitionTypes={[pathname.startsWith("/blog/") ? "nav-back" : "nav-forward"]} aria-current={pathname === "/blog" || pathname.startsWith("/blog/") ? "page" : undefined}>文集</Link>
    </nav>
  );
}
