"use client";

import { Search, X } from "lucide-react";
import { useId, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useReaderDialog } from "../hooks/use-reader-dialog";
import { parseFilters, type BlogFilters } from "../navigation";
import { SearchForm } from "./search-form";

/**
 * 导航和移动列表共用搜索弹层，不额外请求数据或建立搜索缓存。
 * @param props 当前筛选与触发按钮样式。
 * @returns 搜索按钮和按需挂载的原生对话框。
 */
export function SearchLauncher({ filters = parseFilters({}), className = "explore-button" }: {
  filters?: BlogFilters;
  className?: string;
}): ReactElement {
  const id = useId();
  const { open, dialog, show, close, dismiss } = useReaderDialog(false, 'input[type="search"]');
  return (
    <>
      <button className={className} type="button" onClick={show} aria-haspopup="dialog" aria-expanded={open}>
        <Search size={16} aria-hidden="true" /><span>搜索</span>
      </button>
      {open && createPortal(
        <dialog className="explore-dialog" ref={dialog} onClose={dismiss} aria-labelledby={`${id}-title`}
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <header><h2 id={`${id}-title`}>搜索文章</h2>
            <button type="button" className="icon-button" aria-label="关闭搜索" onClick={close}><X size={18} /></button>
          </header>
          <SearchForm filters={filters} inputId={`${id}-search`} onSubmit={close} />
          <p>搜索标题或标签，找到想读的那一篇。</p>
        </dialog>, document.body,
      )}
    </>
  );
}
