import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { site } from "@/config/site";

/**
 * 首页以居中介绍建立站点身份，下方自然衔接最近文稿。
 * @returns 标识、简介与阅读入口。
 */
export function HomeIntro(): ReactElement {
  return (
    <section className="home-intro" aria-label="博客介绍">
      <div className="identity-monogram" aria-hidden="true">N<span>.</span></div>
      <h1>Hi, I&apos;m <span>Nubbi</span><span className="intro-wave" aria-hidden="true">👋</span></h1>
      <p className="home-intro-title">在文字里，<em>记录</em>生活与灵感。</p>
      <p className="home-intro-description">{site.description}</p>
      <div className="intro-actions"><a href="#articles" className="text-link">最近文章 <ArrowDown size={15} /></a>
        <Link href="/blog" className="text-link">全部文稿 <ArrowUpRight size={15} /></Link>
      </div>
    </section>
  );
}
