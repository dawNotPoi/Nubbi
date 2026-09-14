import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ListTree } from "lucide-react";

interface HeadingEntry {
  level: number;
  text: string;
  pos: number;
}

interface HeadingElement {
  element: HTMLElement;
  index: number;
}

const ACTIVE_HEADING_OFFSET = 96;
const SCROLL_END_TOLERANCE = 2;

function getScrollRoot(editor: Editor): HTMLElement | null {
  return (
    editor.view.dom.closest<HTMLElement>("[data-note-scroll-container]") ??
    editor.view.dom.closest<HTMLElement>("main")
  );
}

function extractHeadings(editor: Editor): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
    }
  });
  return headings;
}

function scrollToHeading(editor: Editor, pos: number) {
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return;

  const scrollRoot = getScrollRoot(editor);
  if (scrollRoot) {
    const rootRect = scrollRoot.getBoundingClientRect();
    const headingRect = dom.getBoundingClientRect();
    const top =
      scrollRoot.scrollTop +
      headingRect.top -
      rootRect.top -
      ACTIVE_HEADING_OFFSET;

    scrollRoot.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
    return;
  }

  window.scrollTo({
    top: Math.max(
      0,
      window.scrollY + dom.getBoundingClientRect().top - ACTIVE_HEADING_OFFSET,
    ),
    behavior: "smooth",
  });
}

function getHeadingElements(
  editor: Editor,
  headings: HeadingEntry[],
): HeadingElement[] {
  return headings.flatMap(({ pos }, index) => {
    const dom = editor.view.nodeDOM(pos);
    return dom instanceof HTMLElement ? [{ element: dom, index }] : [];
  });
}

export default function HeadingTOC({
  editor,
  isMobile,
}: {
  editor: Editor;
  isMobile: boolean;
}) {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const handleEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handleHeadingClick = useCallback(
    (pos: number) => {
      scrollToHeading(editor, pos);
      if (isMobile) setOpen(false);
    },
    [editor, isMobile],
  );

  const updateHeadings = useCallback(() => {
    setHeadings(extractHeadings(editor));
  }, [editor]);

  useEffect(() => {
    updateHeadings();
    const handleUpdate = () => updateHeadings();
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, updateHeadings]);

  useEffect(() => {
    if (headings.length < 2) return;

    const headingElements = getHeadingElements(editor, headings);
    if (headingElements.length === 0) return;

    const scrollRoot = getScrollRoot(editor);
    const scrollTarget: HTMLElement | Window = scrollRoot ?? window;
    let animationFrame: number | null = null;

    const updateActiveHeading = () => {
      animationFrame = null;
      const rootTop = scrollRoot?.getBoundingClientRect().top ?? 0;
      const readingLine = rootTop + ACTIVE_HEADING_OFFSET;
      let nextActiveId = 0;

      headingElements.forEach(({ element, index }) => {
        if (element.getBoundingClientRect().top <= readingLine) {
          nextActiveId = index;
        }
      });

      if (
        scrollRoot &&
        scrollRoot.scrollTop + scrollRoot.clientHeight >=
          scrollRoot.scrollHeight - SCROLL_END_TOLERANCE
      ) {
        nextActiveId = headingElements[headingElements.length - 1].index;
      }

      setActiveId((current) =>
        current === nextActiveId ? current : nextActiveId,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [editor, headings]);

  // Auto-scroll the TOC panel to keep the active heading visible
  useEffect(() => {
    const activeElement = activeRef.current;
    const nav = navRef.current;
    if (!activeElement || !nav) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    if (activeRect.top < navRect.top) {
      nav.scrollTop -= navRect.top - activeRect.top;
    } else if (activeRect.bottom > navRect.bottom) {
      nav.scrollTop += activeRect.bottom - navRect.bottom;
    }
  }, [activeId]);

  if (headings.length < 2) return null;

  return (
    <div className="pointer-events-none sticky top-4 z-40 h-0 md:top-40">
      <div
        className="pointer-events-auto absolute right-2 md:right-[30px]"
        onMouseEnter={isMobile ? undefined : handleEnter}
        onMouseLeave={isMobile ? undefined : handleLeave}
      >
        <div className="relative flex items-start justify-end">
          <button
            aria-expanded={open}
            aria-label={open ? "收起目录" : "展开目录"}
            className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-800 md:hidden"
            onClick={() => setOpen((current) => !current)}
            title={open ? "收起目录" : "展开目录"}
            type="button"
          >
            <ListTree className="size-[18px]" />
          </button>

          {/* vertical bar indicator — always visible */}
          <div className="relative z-10 hidden shrink-0 flex-col items-end gap-[3px] px-1.5 py-3 md:flex">
            {headings.map((h, i) => (
              <button
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  activeId === i
                    ? "bg-neutral-700"
                    : "bg-neutral-300"
                }`}
                style={{
                  width:
                    activeId === i
                      ? 18
                      : h.level === 1
                        ? 14
                        : h.level === 2
                          ? 10
                          : 6,
                  height: activeId === i ? 5 : h.level === 1 ? 4 : 3,
                }}
                type="button"
                title={h.text}
                aria-label={`跳转到: ${h.text}`}
                onClick={() => handleHeadingClick(h.pos)}
              />
            ))}
          </div>

          {/* expanded text panel — on hover, slides left */}
          <div
            className={`absolute right-0 top-11 z-10 transition-opacity duration-150 md:right-full md:-top-3 md:mr-2 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div className="w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-neutral-200/80 bg-white shadow-lg backdrop-blur md:w-52">
              <div className="px-3 pb-2 pt-3 text-xs font-medium text-neutral-400">
                目录
              </div>
              <nav ref={navRef} className="max-h-[50vh] overflow-y-auto px-1 pb-2">
                {headings.map((h, i) => (
                  <button
                    key={i}
                    ref={activeId === i ? activeRef : undefined}
                    className={`block w-full truncate rounded-md px-2 py-1 text-left text-[13px] leading-relaxed transition hover:bg-neutral-100 ${
                      activeId === i
                        ? "font-medium text-neutral-800"
                        : "text-neutral-400"
                    }`}
                    style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                    type="button"
                    onClick={() => handleHeadingClick(h.pos)}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
