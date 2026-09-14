import { Menu, MessageSquarePlus, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "./components/composer";
import { ApprovalDialog } from "./components/approval-dialog";
import { ContextStatus } from "./components/context-status";
import { ConversationDrawer } from "./components/conversation-drawer";
import { EmptyState, MessageView } from "./components/message-view";
import { ModelSwitcher } from "./components/model-switcher";
import { McpSettingsDrawer } from "./components/mcp-settings-drawer";
import { Button } from "./components/ui/button";
import { useChat } from "./use-chat";
import { useExtensions } from "./use-extensions";
import { useModelSwitcher } from "./use-model-switcher";
import { countPartsTokens, DEFAULT_CONTEXT_WINDOW } from "./lib/tokens";

/**
 * 应用根组件，渲染聊天主界面。
 * @returns 聊天应用视图。
 */
export default function App() {
  return <ChatApp />;
}

/**
 * 聊天应用主体：组装消息流、输入区与抽屉式设置/历史面板。
 * @returns 聊天主界面视图。
 */
const ChatApp = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useChat();
  const modelSwitcher = useModelSwitcher();
  const extensions = useExtensions();

  // 新消息到达后滚动到底部。
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.messages]);

  // 上下文占用：优先用服务端压缩后推送的真实值，否则按消息内容本地估算。
  const contextUsage = useMemo(() => {
    if (chat.contextStatus) return chat.contextStatus;
    const usedTokens = chat.messages.reduce(
      (sum, message) => sum + countPartsTokens(message.parts),
      0,
    );
    const maxTokens = modelSwitcher.config?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
    return { usedTokens, maxTokens, truncated: usedTokens > maxTokens };
  }, [chat.contextStatus, chat.messages, modelSwitcher.config?.contextWindow]);

  // /status 面板的数据：模型、token 用量、上下文、会话与能力。
  const statusInfo = useMemo(() => ({
    provider: modelSwitcher.config?.provider ?? "openai-compatible",
    model: modelSwitcher.config?.model ?? "",
    baseUrl: modelSwitcher.config?.baseUrl ?? "",
    contextWindow: modelSwitcher.config?.contextWindow,
    planType: modelSwitcher.planType,
    tokenUsage: {
      promptTokens: (chat.current?.tokenUsage?.promptTokens ?? 0) + (chat.runTokenUsage?.promptTokens ?? 0),
      completionTokens: (chat.current?.tokenUsage?.completionTokens ?? 0) + (chat.runTokenUsage?.completionTokens ?? 0),
      totalTokens: (chat.current?.tokenUsage?.totalTokens ?? 0) + (chat.runTokenUsage?.totalTokens ?? 0),
    },
    contextUsage,
    conversation: {
      title: chat.current?.title ?? "",
      messageCount: chat.messages.length,
    },
    capabilities: {
      skillsEnabled: extensions.skills.filter((skill) => skill.enabled).length,
      skillsTotal: extensions.skills.length,
      mcpAvailable: extensions.servers.filter((server) => server.enabled).length,
      mcpTotal: extensions.servers.length,
    },
  }), [chat.current, chat.messages, chat.runTokenUsage, contextUsage, extensions.servers, extensions.skills, modelSwitcher.config, modelSwitcher.planType]);

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
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pb-1">
        <ModelSwitcher
          currentModel={modelSwitcher.currentModel}
          error={modelSwitcher.error}
          loading={modelSwitcher.loading}
          models={modelSwitcher.models}
          onSwitch={modelSwitcher.switchModel}
          unlocked={modelSwitcher.unlocked}
        />
        <ContextStatus
          maxTokens={contextUsage.maxTokens}
          truncated={contextUsage.truncated}
          usedTokens={contextUsage.usedTokens}
        />
      </div>
      <Composer
        currentModel={modelSwitcher.currentModel}
        generating={chat.generating}
        mcpServers={extensions.servers}
        models={modelSwitcher.models}
        onSelectModel={modelSwitcher.switchModel}
        onSend={chat.send}
        onStop={chat.stop}
        onToggleServer={extensions.toggleServer}
        onToggleSkill={extensions.toggleSkill}
        skills={extensions.skills}
        statusInfo={statusInfo}
        unlocked={extensions.unlocked}
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
        onClose={() => {
          setSettingsOpen(false);
          // 关闭设置后刷新模型与能力清单，解锁/改配置后聊天页立刻同步。
          void modelSwitcher.refresh();
          void extensions.refresh();
        }}
        open={settingsOpen}
      />
      <ApprovalDialog approval={chat.approval} onDecision={(approved) => void chat.decideApproval(approved)} />
    </div>
  );
};
