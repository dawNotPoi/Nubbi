import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

interface HeadingEntry {
  level: number;
  text: string;
  pos: number;
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
  if (dom instanceof HTMLElement) {
    dom.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function HeadingTOC({ editor }: { editor: Editor }) {
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

    const headingEls = document.querySelectorAll(
      ".dn-editor__content h1, .dn-editor__content h2, .dn-editor__content h3, .dn-editor__content h4, .dn-editor__content h5, .dn-editor__content h6",
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const el = visible[0].target as HTMLElement;
          const level = parseInt(el.tagName[1], 10);
          const idx = headings.findIndex(
            (h) => h.level === level && h.text === el.textContent,
          );
          if (idx !== -1) setActiveId(idx);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    headingEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  // Auto-scroll the TOC panel to keep the active heading visible
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeId]);

  if (headings.length < 2) return null;

  return (
    <div className="pointer-events-none sticky top-40 z-40 h-0">
      <div
        className="pointer-events-auto absolute right-[30px]"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="relative flex items-start justify-end">
          {/* vertical bar indicator — always visible */}
          <div className="relative z-10 flex shrink-0 flex-col items-end gap-[3px] px-1.5 py-3">
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
                onClick={() => scrollToHeading(editor, h.pos)}
              />
            ))}
          </div>

          {/* expanded text panel — on hover, slides left */}
          <div className={`absolute right-full -top-3 mr-2 z-10 transition-opacity duration-150 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <div className="w-52 rounded-xl border border-neutral-200/80 bg-white shadow-lg backdrop-blur">
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
                    onClick={() => scrollToHeading(editor, h.pos)}
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
