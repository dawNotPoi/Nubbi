import type { Metadata, Viewport } from "next";
import type { ReactElement, ReactNode } from "react";
import { site } from "@/config/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AmbientBackground } from "@/components/ambient-background";
import { preferenceBootstrap } from "@/features/appearance/preferences";
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
 * 使用一致的阅读壳和跳转链接，避免不同页面导航错位。
 * @param props App Router 渲染的页面内容。
 * @returns 中文博客根布局。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: preferenceBootstrap }} /></head>
      <body id="top">
        <AmbientBackground />
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <SiteHeader />
        <main id="main-content" className="site-main">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
