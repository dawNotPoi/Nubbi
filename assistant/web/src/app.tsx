import { Menu, MessageSquarePlus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Composer } from "./components/composer";
import { ApprovalDialog } from "./components/approval-dialog";
import { ConversationDrawer } from "./components/conversation-drawer";
import { EmptyState, MessageView } from "./components/message-view";
import { McpSettingsDrawer } from "./components/mcp-settings-drawer";
import { Button } from "./components/ui/button";
import { useChat } from "./use-chat";

export default function App() {
  return <ChatApp />;
}

const ChatApp = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.messages]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 pt-[env(safe-area-inset-top)]">
        <Button
          aria-label="打开历史对话"
          onClick={() => setDrawerOpen(true)}
          size="icon"
          variant="ghost"
        >
          <Menu />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {chat.current?.title || "通用助手"}
          </p>
          <p className="text-xs text-muted-foreground">MCP + Skills</p>
        </div>
        <Button
          aria-label="打开设置"
          onClick={() => setSettingsOpen(true)}
          size="icon"
          title="设置"
          variant="ghost"
        >
          <Settings />
        </Button>
        <Button
          aria-label="新建对话"
          onClick={() => void chat.select()}
          size="icon"
          variant="ghost"
        >
          <MessageSquarePlus />
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {chat.loading ? (
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-muted" />
            <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : !chat.messages.length ? (
          <EmptyState />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
            {chat.messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {chat.error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
          {chat.error}
        </div>
      ) : null}
      <Composer
        generating={chat.generating}
        onSend={chat.send}
        onStop={chat.stop}
      />
      <ConversationDrawer
        conversations={chat.conversations}
        currentId={chat.current?.id}
        onClose={() => setDrawerOpen(false)}
        onDelete={chat.remove}
        onSelect={(id) => {
          void chat.select(id);
          setDrawerOpen(false);
        }}
        open={drawerOpen}
      />
      <McpSettingsDrawer
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
      />
      <ApprovalDialog approval={chat.approval} onDecision={(approved) => void chat.decideApproval(approved)} />
    </div>
  );
};
