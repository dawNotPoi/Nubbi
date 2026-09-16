import Link from "next/link";
import type { ReactElement } from "react";
import { site } from "@/config/site";
import { ThemeSelect } from "./theme-select";
import { BackgroundToggle } from "./background-toggle";

/**
 * 页脚集中提供站点信息、探索入口和外观偏好，不挤占阅读区域。
 * @returns 包含真实链接与主题设置的页脚。
 */
export function SiteFooter(): ReactElement {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-about"><Link href="/" className="footer-brand">{site.name}</Link>
          <p>让想法留下来。</p><small>© {new Date().getFullYear()} {site.name}</small>
        </div>
        <nav aria-label="页脚导航"><p>探索</p><Link href="/blog">全部文稿</Link><Link href="/blog#topics">文章主题</Link></nav>
        <nav aria-label="阅读导航"><p>阅读</p><a href="#top">回到顶部 ↑</a>{site.editorUrl && <a href={site.editorUrl} target="_blank" rel="noopener noreferrer">写作 ↗</a>}</nav>
      </div>
      <div className="footer-preferences"><ThemeSelect /><BackgroundToggle /></div>
    </footer>
  );
}
