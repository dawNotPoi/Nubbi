"use client";

import { ChevronUp, List, X } from "lucide-react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useArticleOutline, type OutlineItem } from "../hooks/use-article-outline";
import { useReaderDialog } from "../hooks/use-reader-dialog";
import { ReadingControls } from "./reading-controls";

/**
 * 桌面和手机复用相同目录，锚点仍遵循浏览器原生导航。
 * @param props 标题、当前章节与移动浮层关闭回调。
 * @returns 正文锚点导航。
 */
function OutlineLinks({ headings, activeId, onSelect }: {
  headings: OutlineItem[];
  activeId: string;
  onSelect?: () => void;
}): ReactElement {
  return (
    <nav aria-label="本文目录">
      {headings.map((heading) => (
        <a key={heading.id} href={`#${heading.id}`} data-depth={heading.depth}
          aria-current={activeId === heading.id ? "location" : undefined} onClick={onSelect}>
          {heading.title}
        </a>
      ))}
    </nav>
  );
}

/**
 * 桌面使用安静的侧栏；窄屏把目录和排版放在拇指可达的底部工具栏。
 * @returns 阅读进度、排版控制和可访问的原生目录对话框。
 */
export function ArticleOutline(): ReactElement {
  const { headings, activeId, progress } = useArticleOutline();
  const { open, dialog, show, close, dismiss } = useReaderDialog(true);
  const current = headings.find((heading) => heading.id === activeId);
  return (
    <div className="article-outline">
      <div className="reading-progress">
        <span>阅读进度</span><span>{progress}%</span>
        <progress max={100} value={progress} aria-label="文章阅读进度" />
      </div>
      <div className="outline-desktop">
        {headings.length > 0 && <>
          <p className="outline-title">本文目录</p>
          <OutlineLinks headings={headings} activeId={activeId} />
        </>}
        <ReadingControls />
      </div>
      <div className="reading-dock">
        <button type="button" className="outline-trigger" onClick={show} aria-haspopup="dialog" aria-expanded={open}
          disabled={!headings.length} aria-label={headings.length ? "打开本文目录" : "本文没有章节目录"}>
          <List size={18} aria-hidden="true" />
          <span><span>目录</span><span className="dock-chapter">{current?.title || "正文"}</span></span>
          <ChevronUp size={14} aria-hidden="true" />
        </button>
        <ReadingControls />
      </div>
      {open && createPortal(
        <dialog className="outline-sheet" ref={dialog} onClose={dismiss} aria-labelledby="outline-sheet-title"
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="outline-sheet-content">
            <header><div><h2 id="outline-sheet-title">本文目录</h2><p>已读 {progress}% · {headings.length} 个章节</p></div>
              <button type="button" className="icon-button" aria-label="关闭目录" onClick={close}><X size={20} aria-hidden="true" /></button>
            </header>
            <OutlineLinks headings={headings} activeId={activeId} onSelect={close} />
          </div>
        </dialog>, document.body,
      )}
    </div>
  );
}
