import type { FileCategory } from "@/api/file";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CATEGORY_OPTIONS,
  SORT_OPTIONS,
  type FileSortMode,
} from "@/features/file/model";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

type MobileFileFilterSheetProps = {
  category: FileCategory;
  open: boolean;
  sortMode: FileSortMode;
  onCategoryChange: (category: FileCategory) => void;
  onOpenChange: (open: boolean) => void;
  onSortModeChange: (mode: FileSortMode) => void;
};

function ChoiceRow({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
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

export function MobileFileFilterSheet({
  category,
  onCategoryChange,
  onOpenChange,
  onSortModeChange,
  open,
  sortMode,
}: MobileFileFilterSheetProps) {
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftSortMode, setDraftSortMode] = useState(sortMode);

  useEffect(() => {
    if (!open) return;
    setDraftCategory(category);
    setDraftSortMode(sortMode);
  }, [category, open, sortMode]);

  const apply = () => {
    onCategoryChange(draftCategory);
    onSortModeChange(draftSortMode);
    onOpenChange(false);
  };

  const reset = () => {
    setDraftCategory("all");
    setDraftSortMode("updated-desc");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showClose className="max-h-[82dvh]">
        <SheetHeader>
          <SheetTitle>筛选与排序</SheetTitle>
          <SheetDescription>设置完成后一次应用到当前目录。</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pb-3">
          <section>
            <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">排序</h3>
            {SORT_OPTIONS.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={draftSortMode === option.value}
                label={option.label}
                onClick={() => setDraftSortMode(option.value)}
              />
            ))}
          </section>

          <section>
            <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">类型</h3>
            {CATEGORY_OPTIONS.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={draftCategory === option.value}
                label={option.label}
                onClick={() => setDraftCategory(option.value)}
              />
            ))}
          </section>
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
