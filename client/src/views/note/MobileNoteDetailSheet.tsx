import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetSeparator,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Eye, FilePenLine, ImagePlus, PanelTop, Tag } from "lucide-react";

export type MobileNoteDisplayMode = "render" | "markdown" | "split";

type MobileNoteDetailSheetProps = {
  displayMode: MobileNoteDisplayMode;
  hasCover: boolean;
  hasTags: boolean;
  open: boolean;
  published: boolean;
  title: string;
  onAddCover: () => void;
  onAddTag: () => void;
  onDisplayModeChange: (mode: MobileNoteDisplayMode) => void;
  onOpenChange: (open: boolean) => void;
  onPublishedChange: (published: boolean) => void;
};

const modeItems: Array<{
  mode: MobileNoteDisplayMode;
  label: string;
  Icon: typeof Eye;
}> = [
  { mode: "render", label: "富文本编辑", Icon: Eye },
  { mode: "markdown", label: "Markdown", Icon: FilePenLine },
  { mode: "split", label: "Markdown / 预览", Icon: PanelTop },
];

export default function MobileNoteDetailSheet({
  displayMode,
  hasCover,
  hasTags,
  onAddCover,
  onAddTag,
  onDisplayModeChange,
  onOpenChange,
  onPublishedChange,
  open,
  published,
  title,
}: MobileNoteDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showClose>
        <SheetHeader>
          <SheetTitle className="truncate">{title}</SheetTitle>
          <SheetDescription>笔记属性与编辑方式</SheetDescription>
        </SheetHeader>

        <section className="space-y-0.5">
          <SheetRow onClick={() => onPublishedChange(!published)}>
            <Eye />
            <span className="flex-1">公开发布</span>
            <span className="grid size-6 place-items-center text-[var(--brand)]">
              {published ? <Check className="size-[18px]" strokeWidth={2.2} /> : null}
            </span>
          </SheetRow>
          {!hasCover ? (
            <SheetRow onClick={() => { onOpenChange(false); onAddCover(); }}>
              <ImagePlus />
              <span>添加封面</span>
            </SheetRow>
          ) : null}
          {!hasTags ? (
            <SheetRow onClick={() => { onOpenChange(false); onAddTag(); }}>
              <Tag />
              <span>添加标签</span>
            </SheetRow>
          ) : null}
        </section>

        <SheetSeparator />

        <section>
          <h3 className="mb-1 px-2.5 text-[12px] font-medium text-text-muted">编辑方式</h3>
          {modeItems.map(({ Icon, label, mode }) => (
            <SheetRow
              key={mode}
              onClick={() => {
                onDisplayModeChange(mode);
                onOpenChange(false);
              }}
            >
              <Icon />
              <span className="flex-1">{label}</span>
              <span className="grid size-6 place-items-center text-[var(--brand)]">
                {displayMode === mode ? <Check className="size-[18px]" strokeWidth={2.2} /> : null}
              </span>
            </SheetRow>
          ))}
        </section>
      </SheetContent>
    </Sheet>
  );
}
