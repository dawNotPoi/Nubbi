import Image from "next/image";
import { AnchorLink } from "@/components/anchor-link";
import type { ReactElement } from "react";
import { BLOG_COPY } from "../copy";

/**
 * 恢复 Dawn 左侧轮换问候和右侧原始圆形头像。
 * @returns 独立博客首页介绍。
 */
export function HomeIntro(): ReactElement {
  return (
    <section className="home-intro" aria-label="博客介绍">
      <div className="home-intro-copy">
        <p className="home-overline">HELLO, WELCOME TO MY BLOG</p>
        <h1 className="home-greeting">Hi, I&apos;m <em>Dawn.</em></h1>
        <p className="home-typewriter">A Web &lt;Developer/&gt;</p>
        <p className="home-intro-note">{BLOG_COPY.homeIntroduction}<br />{BLOG_COPY.homeDescription}</p>
        <AnchorLink className="home-scroll-link" href="#recent-posts">读读近来的文字 ↓</AnchorLink>
      </div>
      <div className="home-avatar" aria-hidden="true"><Image src="/dawn-avatar.jpg" alt="" width={200} height={200} priority /></div>
    </section>
  );
}
