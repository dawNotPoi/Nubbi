"use client";

import { Hash, X } from "lucide-react";
import { useId, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { BlogTag } from "../api/contracts";
import type { BlogFilters } from "../navigation";
import { useReaderDialog } from "../hooks/use-reader-dialog";
import { SearchForm } from "./search-form";
import { SearchLauncher } from "./search-launcher";
import { TagFilter } from "./tag-filter";

/**
 * PC 搜索和主题放在右栏，手机以入口弹层保留同样的筛选能力。
 * @param props 公开标签与当前 URL 筛选。
 * @returns 右侧探索栏和手机筛选入口。
 */
export function BlogExplorer({ tags, filters }: { tags: BlogTag[]; filters: BlogFilters }): ReactElement {
  const id = useId();
  const { open, dialog, show, close, dismiss } = useReaderDialog();
  return (
    <>
      <aside className="blog-explorer" aria-label="搜索与主题">
        <div className="explorer-panel">
          <SearchForm filters={filters} inputId={`${id}-search`} />
          <TagFilter tags={tags.slice(0, 10)} filters={filters} />
          <button type="button" className="all-tags" onClick={show} aria-haspopup="dialog" aria-expanded={open}>全部标签</button>
        </div>
      </aside>
      <div className="mobile-explorer">
        <SearchLauncher filters={filters} />
        <button type="button" className="explore-button" onClick={show} aria-haspopup="dialog" aria-expanded={open}>
          <Hash size={16} aria-hidden="true" /><span>{filters.tag || "全部标签"}</span>
        </button>
      </div>
      {open && createPortal(
        <dialog className="explore-dialog tag-dialog" ref={dialog} onClose={dismiss} aria-labelledby={`${id}-title`}
          onClick={(event) => {
            if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest("a"))) close();
          }}>
          <header><h2 id={`${id}-title`}>全部标签 <span>{tags.length}</span></h2>
            <button type="button" className="icon-button" aria-label="关闭标签" onClick={close}><X size={18} /></button>
          </header>
          <TagFilter tags={tags} filters={filters} />
          {!tags.length && <p>文章发布后，主题会出现在这里。</p>}
        </dialog>, document.body,
      )}
    </>
  );
}
