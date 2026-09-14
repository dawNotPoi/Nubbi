import { MessageSquare, Trash2, X } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { cn } from "../../lib/utils.ts";
import type { ConversationSummary } from "../../types.ts";

/**
 * 左侧历史对话抽屉：切换会话、新建与删除。
 * @param props.open 是否展开。
 * @param props.conversations 会话摘要列表。
 * @param props.currentId 当前选中的会话 ID，用于高亮。
 * @param props.onClose 关闭回调。
 * @param props.onSelect 选中会话回调。
 * @param props.onDelete 删除会话回调。
 * @returns 历史对话抽屉视图。
 */
export const ConversationDrawer = ({
  open,
  conversations,
  currentId,
  onClose,
  onSelect,
  onDelete,
}: {
  open: boolean;
  conversations: ConversationSummary[];
  currentId?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}): React.JSX.Element => (
  <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
    <button
      aria-label="关闭历史对话"
      className={cn("absolute inset-0 bg-foreground/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
      onClick={onClose}
      type="button"
    />
    <aside
      className={cn(
        "absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl transition-transform",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <p className="font-semibold">历史对话</p>
        <Button aria-label="关闭" onClick={onClose} size="icon" variant="ghost">
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <div
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-3 hover:bg-muted",
              currentId === conversation.id && "bg-muted",
            )}
            key={conversation.id}
          >
            <button
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onSelect(conversation.id)}
              type="button"
            >
              <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{conversation.title}</span>
            </button>
            <button
              aria-label={`删除对话：${conversation.title}`}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-red-600"
              onClick={() => void onDelete(conversation.id)}
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {!conversations.length ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">暂无历史对话</p>
        ) : null}
      </div>
    </aside>
  </div>
);
