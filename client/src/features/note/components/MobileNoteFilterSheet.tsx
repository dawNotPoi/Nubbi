import type { NoteStatus } from "@/api/note";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NoteLibrarySortMode } from "@/features/note/model/library";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

type PublishedFilter = "all" | "published" | "unpublished";
type StatusFilter = "all" | NoteStatus;

type MobileNoteFilterSheetProps = {
  availableTags: { tag: string; count: number }[];
  open: boolean;
  publishedFilter: PublishedFilter;
  sortMode: NoteLibrarySortMode;
  statusFilter: StatusFilter;
  tagsFilter: string[];
  onOpenChange: (open: boolean) => void;
  onPublishedFilterChange: (value: PublishedFilter) => void;
  onSortModeChange: (value: NoteLibrarySortMode) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTagsFilterChange: (value: string[]) => void;
};

const sortOptions: Array<{ value: NoteLibrarySortMode; label: string }> = [
  { value: "updated-desc", label: "最近修改" },
  { value: "updated-asc", label: "最早修改" },
  { value: "name-asc", label: "名称 A–Z" },
  { value: "name-desc", label: "名称 Z–A" },
];
const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "inbox", label: "Inbox" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];
const publishedOptions: Array<{ value: PublishedFilter; label: string }> = [
  { value: "all", label: "全部发布状态" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];

function ChoiceRow({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className="flex min-h-11 w-full items-center rounded-[8px] px-2.5 text-left text-[15px] text-text-primary transition-colors active:bg-bg-selected hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      onClick={onClick}
      type="button"
    >
      <span className="flex-1">{label}</span>
      <span className="grid size-6 place-items-center text-[var(--brand)]">
        {checked ? <Check aria-hidden="true" className="size-[18px]" strokeWidth={2.2} /> : null}
      </span>
    </button>
  );
}

export function MobileNoteFilterSheet({
  availableTags,
  open,
  onOpenChange,
  onPublishedFilterChange,
  onSortModeChange,
  onStatusFilterChange,
  onTagsFilterChange,
  publishedFilter,
  sortMode,
  statusFilter,
  tagsFilter,
}: MobileNoteFilterSheetProps) {
  const [draftSort, setDraftSort] = useState(sortMode);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(statusFilter);
  const [draftPublished, setDraftPublished] = useState<PublishedFilter>(publishedFilter);
  const [draftTags, setDraftTags] = useState<string[]>(tagsFilter);

  useEffect(() => {
    if (!open) return;
    setDraftSort(sortMode);
    setDraftStatus(statusFilter);
    setDraftPublished(publishedFilter);
    setDraftTags(tagsFilter);
  }, [open, publishedFilter, sortMode, statusFilter, tagsFilter]);

  const apply = () => {
    onSortModeChange(draftSort);
    onStatusFilterChange(draftStatus);
    onPublishedFilterChange(draftPublished);
    onTagsFilterChange(draftTags);
    onOpenChange(false);
  };

  const reset = () => {
    setDraftSort("updated-desc");
    setDraftStatus("all");
    setDraftPublished("all");
    setDraftTags([]);
  };

  const toggleTag = (tag: string) => {
    setDraftTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showClose className="max-h-[82dvh]">
        <SheetHeader>
          <SheetTitle>筛选与排序</SheetTitle>
          <SheetDescription>选择完成后一次应用，避免列表在设置过程中反复重排。</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pb-3">
          <section>
            <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">排序</h3>
            {sortOptions.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={draftSort === option.value}
                label={option.label}
                onClick={() => setDraftSort(option.value)}
              />
            ))}
          </section>

          <section>
            <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">状态</h3>
            {statusOptions.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={draftStatus === option.value}
                label={option.label}
                onClick={() => setDraftStatus(option.value)}
              />
            ))}
          </section>

          <section>
            <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">发布</h3>
            {publishedOptions.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={draftPublished === option.value}
                label={option.label}
                onClick={() => setDraftPublished(option.value)}
              />
            ))}
          </section>

          {availableTags.length > 0 ? (
            <section>
              <h3 className="mb-2 px-2.5 text-[12px] font-medium text-text-muted">标签</h3>
              <div className="flex flex-wrap gap-2 px-2.5">
                {availableTags.map(({ tag, count }) => {
                  const selected = draftTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      className={clsx(
                        "min-h-9 rounded-full border px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                        selected
                          ? "border-[var(--brand)] bg-brand-soft text-[var(--brand-strong)]"
                          : "border-border-button bg-surface text-text-muted active:bg-bg-hover",
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag} · {count}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-2 flex gap-2 border-t border-border-row bg-surface px-4 pb-1 pt-3">
          <Button className="h-11 flex-1 rounded-[8px]" variant="ghost" onClick={reset}>
            重置
          </Button>
          <Button className="h-11 flex-1 rounded-[8px]" variant="primary" onClick={apply}>
            完成
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
