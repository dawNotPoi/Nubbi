import type { Metadata, Viewport } from "next";
import { AnchorLink } from "@/components/anchor-link";
import type { ReactElement, ReactNode } from "react";
import { site } from "@/config/site";
import { SiteHeader } from "@/components/site-header";
import { THEME_BOOTSTRAP } from "@/features/appearance/preferences";
import { ThemeProvider } from "@/features/appearance/theme-provider";
import { SiteTransition } from "@/features/appearance/site-transition";
import "./globals.css";

/** 全站标题与分享信息由统一配置生成。 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · 记录与思考`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", locale: "zh_CN", siteName: site.name },
};

/** 浏览器原生控件遵循系统亮暗主题。 */
export const viewport: Viewport = { colorScheme: "light dark" };

/**
 * 使用 Dawn 式顶栏和统一内容容器，同时保留可跳过导航的入口。
 * @param props App Router 渲染的页面内容。
 * @returns 中文博客根布局。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  // 显式声明根快照，避免 React 在仅按钮边界变化时将根过渡判定为无效；是否捕获由活动类型控制。
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" style={{ viewTransitionName: "site-theme" }} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} /></head>
      <body id="top">
        <ThemeProvider>
          <AnchorLink className="skip-link" href="#main-content">
            跳到正文
          </AnchorLink>
          <SiteHeader />
          <SiteTransition scope="page">
            <main id="main-content" className="site-main">
              {children}
            </main>
          </SiteTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
