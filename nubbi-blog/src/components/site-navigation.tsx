"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Hash, House } from "lucide-react";
import type { ReactElement } from "react";
import { SearchLauncher } from "@/features/blog/components/search-launcher";

/**
 * 桌面悬浮导航和手机底部导航共用真实博客入口。
 * @returns 显示当前位置并支持全站搜索的主导航。
 */
export function SiteNavigation(): ReactElement {
  const pathname = usePathname();
  return (
    <nav className="header-nav" aria-label="主导航">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><House size={15} /><span>首页</span></Link>
      <Link href="/blog" aria-current={pathname.startsWith("/blog") ? "page" : undefined}><FileText size={15} /><span>文稿</span></Link>
      <Link href="/blog#topics"><Hash size={15} /><span>主题</span></Link>
      <SearchLauncher className="nav-search" />
    </nav>
  );
}
