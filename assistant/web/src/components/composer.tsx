import { SendHorizontal, Square } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "./ui/button";

export const Composer = ({
  generating,
  onSend,
  onStop,
}: {
  generating: boolean;
  onSend: (content: string) => Promise<void>;
  onStop: () => Promise<void>;
}) => {
  const [value, setValue] = useState("");

  const submit = async (): Promise<void> => {
    const content = value.trim();
    if (!content || generating) return;
    setValue("");
    await onSend(content);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <footer className="shrink-0 border-t bg-background px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-muted/40 p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          aria-label="输入消息"
          className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
          disabled={generating}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="给助手发送消息"
          rows={1}
          value={value}
        />
        {generating ? (
          <Button aria-label="停止生成" onClick={() => void onStop()} size="icon" variant="outline">
            <Square className="fill-current" />
          </Button>
        ) : (
          <Button aria-label="发送消息" disabled={!value.trim()} onClick={() => void submit()} size="icon">
            <SendHorizontal />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
        AI 可能出错，请核对重要信息
      </p>
    </footer>
  );
};
