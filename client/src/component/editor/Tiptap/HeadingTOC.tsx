import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  if (headings.length < 2) return null;

  const content = (
    <div className="fixed right-[30px] top-[200px] z-50">
      <div className="group/toc flex items-start justify-end">
        {/* vertical bar indicator — always visible */}
        <div className="relative z-10 flex shrink-0 flex-col items-end gap-[3px] rounded-full bg-white/60 px-1.5 py-3 shadow-sm backdrop-blur-sm transition-shadow group-hover/toc:shadow-md">
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
                      ? 12
                      : h.level === 2
                        ? 8
                        : 5,
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
        <div className="pointer-events-none absolute right-full -top-3 mr-2 z-10 opacity-0 transition-opacity duration-150 group-hover/toc:pointer-events-auto group-hover/toc:opacity-100">
          <div className="w-52 rounded-xl border border-neutral-200/80 bg-white shadow-lg backdrop-blur">
            <div className="px-3 pb-2 pt-3 text-xs font-medium text-neutral-400">
              目录
            </div>
            <nav className="max-h-[50vh] overflow-y-auto px-1 pb-2">
              {headings.map((h, i) => (
                <button
                  key={i}
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
  );

  return createPortal(content, document.body);
}
