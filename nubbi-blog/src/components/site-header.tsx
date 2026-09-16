import Link from "next/link";
import type { ReactElement } from "react";
import { site } from "@/config/site";
import { ThemeSelect } from "./theme-select";
import { SiteNavigation } from "./site-navigation";

/**
 * 页头只保留标识、居中导航和外观入口，给文章留出完整视觉空间。
 * @returns 全站固定页头。
 */
export function SiteHeader(): ReactElement {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${site.name} 首页`} title={site.name}>
        <span aria-hidden="true">N<span className="brand-dot">.</span></span>
      </Link>
      <SiteNavigation />
      <div className="header-actions"><ThemeSelect /></div>
    </header>
  );
}
