import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { site } from "@/config/site";
import { SiteNavigation } from "./site-navigation";
import { ThemeToggle } from "./theme-toggle";

/**
 * 使用 Dawn 原始头像，集中提供两个页面导航与亮暗切换。
 * @returns 全站顶栏。
 */
export function SiteHeader(): ReactElement {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" transitionTypes={["nav-back"]} aria-label={`${site.name} 首页`} title={site.name}>
          <Image src="/dawn-avatar.jpg" alt="" width={40} height={40} loading="eager" />
          <span>{site.name}.</span>
        </Link>
        <div className="header-actions">
          <SiteNavigation />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
