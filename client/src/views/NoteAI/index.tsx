import { Header } from "@/component/Header";
import TiptapEditor from "@/component/editor/Tiptap";
import {
  NoteAiConfig,
  NoteAiMessage,
  NoteAiModel,
  NoteAiProvider,
  NoteAiSession,
  createNoteAiSession,
  deleteNoteAiSession,
  fetchNoteAiModels,
  getNoteAiConfig,
  getNoteAiMessages,
  getNoteAiSessions,
  saveNoteAiConfig,
  streamNoteAiChat,
} from "@/api/noteAi";
import { Button, Empty, Input, Select, Spin, Switch, Tooltip, message } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import {
  Bot,
  Check,
  Copy,
  Globe,
  LibraryBig,
  MessageSquarePlus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const { TextArea } = Input;

const PROVIDER_OPTIONS: Array<{ label: string; value: NoteAiProvider }> = [
  { label: "OpenAI", value: "openai" },
  { label: "第三方中转站", value: "openai-compatible" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Gemini", value: "gemini" },
];

const getBaseUrlPlaceholder = (provider: NoteAiProvider) => {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/models";
    default:
      return "https://api.openai.com/v1 或中转站 OpenAI 兼容地址";
  }
};

const formatTime = (value?: string) => {
  if (!value) return "";
  return dayjs(value).format("MM-DD HH:mm");
};

const createPendingAssistantMessage = (sessionId: string): NoteAiMessage => ({
  _id: `pending-${Date.now()}`,
  sessionId,
  userId: "",
  role: "assistant",
  content: "",
  sources: [],
  status: "streaming",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createLocalUserMessage = (
  sessionId: string,
  content: string,
): NoteAiMessage => ({
  _id: `local-user-${Date.now()}`,
  sessionId,
  userId: "",
  role: "user",
  content,
  sources: [],
  status: "completed",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const getSourceKey = (messageId: string, source: NoteAiMessage["sources"][number]) =>
  source.type === "web"
    ? `${messageId}-web-${source.url}`
    : `${messageId}-note-${source.postId}`;

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const MessageBubble = ({ item }: { item: NoteAiMessage }) => {
  const navigate = useNavigate();
  const isAssistant = item.role === "assistant";
  const [answerCopied, setAnswerCopied] = useState(false);

  const handleCopyAnswer = async () => {
    try {
      await copyText(item.content);
      setAnswerCopied(true);
      message.success("回答已复制");
      window.setTimeout(() => setAnswerCopied(false), 1400);
    } catch (error: any) {
      message.error(error?.message || "复制失败");
    }
  };

  return (
    <div className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={clsx(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
          isAssistant
            ? "bg-white text-neutral-800"
            : "bg-neutral-900 text-white",
        )}
      >
        {isAssistant ? (
          item.content ? (
            <TiptapEditor
              defaultValue={item.content}
              editable={false}
              showMermaidSourceWhenReadOnly
              variant="preview"
            />
          ) : (
            <div className="text-sm leading-6 text-neutral-500">
              {item.status === "streaming" ? "..." : ""}
            </div>
          )
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6">
            {item.content || (item.status === "streaming" ? "..." : "")}
          </div>
        )}
        {isAssistant && item.content && (
          <div className="mt-3 flex items-center justify-end border-t border-neutral-100 pt-2">
            <Tooltip title={answerCopied ? "已复制" : "复制回答"}>
              <button
                type="button"
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                onClick={handleCopyAnswer}
              >
                {answerCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{answerCopied ? "已复制" : "复制"}</span>
              </button>
            </Tooltip>
          </div>
        )}
        {isAssistant && Array.isArray(item.sources) && item.sources.length > 0 && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
            <div className="mb-2 font-medium text-neutral-700">参考来源</div>
            <div className="space-y-2">
              {item.sources.map((source) => (
                <button
                  key={getSourceKey(item._id, source)}
                  type="button"
                  className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left hover:border-neutral-300 hover:bg-neutral-100"
                  onClick={() => {
                    if (source.type === "web") {
                      window.open(source.url, "_blank", "noopener,noreferrer");
                      return;
                    }

                    navigate(`/note/${source.postId}`);
                  }}
                >
                  <div className="flex items-center gap-2 font-medium text-neutral-800">
                    <span>{source.type === "web" ? "网页" : "笔记"}</span>
                    <span className="min-w-0 flex-1 truncate">{source.title}</span>
                  </div>
                  <div className="mt-1 line-clamp-3 text-neutral-500">
                    {source.snippet || "无摘要片段"}
                  </div>
                  {source.type === "web" && (
                    <div className="mt-1 truncate text-[11px] text-neutral-400">
                      {source.url}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function NoteAI() {
  const [config, setConfig] = useState<NoteAiConfig>({
    provider: "openai-compatible",
    baseURL: "",
    model: "",
    enableWeb: false,
    enableKnowledgeBase: true,
    hasApiKey: false,
  });
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [modelOptions, setModelOptions] = useState<NoteAiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [sessions, setSessions] = useState<NoteAiSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [messagesState, setMessagesState] = useState<Record<string, NoteAiMessage[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string>();
  const [retryMessage, setRetryMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const activeMessages = activeSessionId ? messagesState[activeSessionId] || [] : [];
  const safeModelOptions = Array.isArray(modelOptions) ? modelOptions : [];
  const modelSelectOptions = [
    ...safeModelOptions.map((item) => ({
      label: item.ownedBy ? `${item.id} (${item.ownedBy})` : item.id,
      value: item.id,
    })),
    ...(config.model && !safeModelOptions.some((item) => item.id === config.model)
      ? [{ label: config.model, value: config.model }]
      : []),
  ];

  const loadSessions = useCallback(async () => {
    const nextSessions = await getNoteAiSessions();
    setSessions(nextSessions);
    return nextSessions;
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const nextMessages = await getNoteAiMessages(sessionId);
      setMessagesState((current) => ({
        ...current,
        [sessionId]: nextMessages,
      }));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [nextConfig, nextSessions] = await Promise.all([
          getNoteAiConfig(),
          loadSessions(),
        ]);
        setConfig(nextConfig);
        if (nextSessions[0]?._id) {
          setActiveSessionId(nextSessions[0]._id);
        }
      } catch (error: any) {
        message.error(error?.message || "加载 Note AI 失败");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [loadSessions]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (messagesState[activeSessionId]) return;
    loadMessages(activeSessionId);
  }, [activeSessionId, loadMessages, messagesState]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeMessages]);

  const upsertSession = useCallback((nextSession: NoteAiSession) => {
    setSessions((current) => {
      const rest = current.filter((item) => item._id !== nextSession._id);
      return [nextSession, ...rest];
    });
  }, []);

  const handleCreateSession = useCallback(async () => {
    try {
      const session = await createNoteAiSession();
      upsertSession(session);
      setActiveSessionId(session._id);
      setMessagesState((current) => ({
        ...current,
        [session._id]: [],
      }));
    } catch (error: any) {
      message.error(error?.message || "新建会话失败");
    }
  }, [upsertSession]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteNoteAiSession(sessionId);
        setSessions((current) => current.filter((item) => item._id !== sessionId));
        setMessagesState((current) => {
          const next = { ...current };
          delete next[sessionId];
          return next;
        });
        if (activeSessionId === sessionId) {
          setActiveSessionId(undefined);
        }
      } catch (error: any) {
        message.error(error?.message || "删除会话失败");
      }
    },
    [activeSessionId],
  );

  const handleSaveConfig = useCallback(async () => {
    setSavingConfig(true);
    try {
      const nextConfig = await saveNoteAiConfig({
        provider: config.provider,
        baseURL: config.baseURL,
        model: config.model,
        apiKey: apiKeyDraft === "" ? undefined : apiKeyDraft,
        enableWeb: config.enableWeb,
        enableKnowledgeBase: config.enableKnowledgeBase,
      });
      setConfig(nextConfig);
      setApiKeyDraft("");
      message.success("AI 配置已保存");
    } catch (error: any) {
      message.error(error?.message || "保存 AI 配置失败");
    } finally {
      setSavingConfig(false);
    }
  }, [apiKeyDraft, config]);

  const handleFetchModels = useCallback(async () => {
    if (!apiKeyDraft.trim() && !config.hasApiKey) {
      message.warning("请先输入 API Key，或保存已有 Key 后再拉取模型");
      return;
    }

    if (!config.baseURL.trim()) {
      message.warning("请先填写 Base URL 后再拉取模型");
      return;
    }

    setLoadingModels(true);
    try {
      const models = await fetchNoteAiModels({
        provider: config.provider,
        baseURL: config.baseURL,
        apiKey: apiKeyDraft.trim() ? apiKeyDraft : undefined,
      });

      setModelOptions(models);
      setConfig((current) => ({
        ...current,
        model: current.model || models[0]?.id || "",
      }));
      message.success(`已拉取 ${models.length} 个模型`);
    } catch (error: any) {
      message.error(error?.message || "拉取模型列表失败");
    } finally {
      setLoadingModels(false);
    }
  }, [apiKeyDraft, config.baseURL, config.hasApiKey, config.provider]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);

    if (activeSessionId) {
      setMessagesState((current) => ({
        ...current,
        [activeSessionId]: (current[activeSessionId] || []).filter(
          (item) => item.status !== "streaming",
        ),
      }));
    }
  }, [activeSessionId]);

  const removeStreamingMessage = useCallback((sessionId: string) => {
    setMessagesState((current) => ({
      ...current,
      [sessionId]: (current[sessionId] || []).filter(
        (item) => item.status !== "streaming",
      ),
    }));
  }, []);

  const handleSend = useCallback(
    async (overrideMessage?: string) => {
      const outgoingMessage = (overrideMessage ?? inputValue).trim();
      if (!outgoingMessage || isStreaming) return;

      setStreamError(undefined);
      setRetryMessage(outgoingMessage);

      const initialSessionId = activeSessionId;
      const tempSessionId = initialSessionId || `draft-${Date.now()}`;
      let streamSessionId = tempSessionId;
      const localUserMessage = createLocalUserMessage(tempSessionId, outgoingMessage);
      const pendingAssistant = createPendingAssistantMessage(tempSessionId);

      setMessagesState((current) => ({
        ...current,
        [tempSessionId]: [
          ...(current[tempSessionId] || []),
          localUserMessage,
          pendingAssistant,
        ],
      }));

      if (!initialSessionId) {
        setActiveSessionId(tempSessionId);
      }

      setInputValue("");
      setIsStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        await streamNoteAiChat(
          {
            sessionId: initialSessionId,
            message: outgoingMessage,
            enableKnowledgeBase: config.enableKnowledgeBase,
            enableWeb: config.enableWeb,
          },
          {
            onSession: ({ sessionId, title }) => {
              streamSessionId = sessionId;

              if (!initialSessionId) {
                const now = new Date().toISOString();
                upsertSession({
                  _id: sessionId,
                  userId: "",
                  title,
                  lastMessageAt: now,
                  createdAt: now,
                  updatedAt: now,
                });
                setMessagesState((current) => {
                  const draftMessages = current[tempSessionId] || [];
                  const next = { ...current };
                  delete next[tempSessionId];
                  next[sessionId] = draftMessages.map((item) => ({
                    ...item,
                    sessionId,
                  }));
                  return next;
                });
                setActiveSessionId(sessionId);
                return;
              }

              upsertSession({
                _id: sessionId,
                userId: "",
                title,
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            },
            onSources: ({ sources }) => {
              const targetSessionId = streamSessionId;
              setMessagesState((current) => ({
                ...current,
                [targetSessionId]: (current[targetSessionId] || []).map((item) =>
                  item.status === "streaming" ? { ...item, sources } : item,
                ),
              }));
            },
            onDelta: ({ delta }) => {
              const targetSessionId = streamSessionId;
              setMessagesState((current) => ({
                ...current,
                [targetSessionId]: (current[targetSessionId] || []).map((item) =>
                  item.status === "streaming"
                    ? { ...item, content: `${item.content}${delta}` }
                    : item,
                ),
              }));
            },
            onDone: ({ message: assistantMessage }) => {
              const targetSessionId = assistantMessage.sessionId || streamSessionId;
              streamSessionId = targetSessionId;
              setMessagesState((current) => ({
                ...current,
                [targetSessionId]: [
                  ...(current[targetSessionId] || []).filter(
                    (item) => item.status !== "streaming",
                  ),
                  assistantMessage,
                ],
              }));
              void loadSessions().catch((error: any) => {
                message.error(error?.message || "刷新会话列表失败");
              });
            },
            onError: ({ message: nextError }) => {
              removeStreamingMessage(streamSessionId);
              setStreamError(nextError);
            },
          },
          abortController.signal,
        );
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          removeStreamingMessage(streamSessionId);
          setStreamError(error?.message || "AI 生成失败");
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      activeSessionId,
      config.enableKnowledgeBase,
      config.enableWeb,
      inputValue,
      isStreaming,
      loadSessions,
      removeStreamingMessage,
      upsertSession,
    ],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-w-[1200px] flex-col overflow-hidden">
      <Header className="shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Bot className="size-4" />
            <span>Note AI</span>
          </div>
          <div className="text-xs text-neutral-400">
            SSE Streaming · Notes as Knowledge Base
          </div>
        </div>
      </Header>

      <main className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_340px] gap-4 overflow-hidden px-4 py-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-800">会话</div>
              <div className="text-xs text-neutral-500">保存你的 AI 历史对话</div>
            </div>
            <Button
              type="primary"
              icon={<MessageSquarePlus size={16} />}
              onClick={handleCreateSession}
            >
              新建
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {sessions.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有会话" />
            ) : (
              sessions.map((session) => (
                <button
                  type="button"
                  key={session._id}
                  className={clsx(
                    "block w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    activeSessionId === session._id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100",
                  )}
                  onClick={() => {
                    if (isStreaming) {
                      stopStreaming();
                    }
                    setActiveSessionId(session._id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{session.title}</div>
                      <div
                        className={clsx(
                          "mt-1 text-xs",
                          activeSessionId === session._id
                            ? "text-neutral-300"
                            : "text-neutral-500",
                        )}
                      >
                        {formatTime(session.updatedAt)}
                      </div>
                    </div>
                    <Trash2
                      className={clsx(
                        "size-4 shrink-0",
                        activeSessionId === session._id
                          ? "text-neutral-300"
                          : "text-neutral-400",
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteSession(session._id);
                      }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#f7f7f5] shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="text-sm font-semibold text-neutral-800">
              {sessions.find((item) => item._id === activeSessionId)?.title || "新对话"}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
                <LibraryBig className="size-3.5" />
                <span>
                  {config.enableKnowledgeBase ? "笔记知识库已开启" : "笔记知识库已关闭"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="size-3.5" />
                <span>
                  {config.enableWeb ? "联网搜索已开启" : "联网搜索已关闭"}
                </span>
              </div>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
          >
            {loadingMessages ? (
              <div className="flex justify-center py-10">
                <Spin />
              </div>
            ) : activeMessages.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="从右下角输入框开始一段对话"
              />
            ) : (
              activeMessages.map((item) => <MessageBubble key={item._id} item={item} />)
            )}
          </div>

          <div className="border-t border-neutral-200 px-5 py-4">
            {streamError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <div>{streamError}</div>
                {retryMessage && (
                  <button
                    type="button"
                    className="mt-2 text-red-700 underline"
                    onClick={() => handleSend(retryMessage)}
                  >
                    重试上一条消息
                  </button>
                )}
              </div>
            )}
            <TextArea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              autoSize={{ minRows: 3, maxRows: 8 }}
              placeholder="问我你的笔记内容、总结观点、串联项目思路……"
              onPressEnter={(event) => {
                if (event.shiftKey) return;
                event.preventDefault();
                handleSend();
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                支持 SSE 流式输出，回答会自动写入历史会话
              </div>
              <div className="flex items-center gap-2">
                {isStreaming && <Button onClick={stopStreaming}>停止生成</Button>}
                <Button
                  type="primary"
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isStreaming}
                >
                  {isStreaming ? "生成中..." : "发送"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Settings2 className="size-4" />
            <span>AI 设置</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Provider
              </div>
              <Select
                className="w-full"
                value={config.provider}
                options={PROVIDER_OPTIONS}
                onChange={(value) => {
                  setModelOptions([]);
                  setConfig((current) => ({
                    ...current,
                    provider: value,
                    model: "",
                  }));
                }}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Base URL
              </div>
              <Input
                value={config.baseURL}
                placeholder={getBaseUrlPlaceholder(config.provider)}
                onChange={(event) => {
                  setModelOptions([]);
                  setConfig((current) => ({
                    ...current,
                    baseURL: event.target.value,
                    model: "",
                  }));
                }}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Model
              </div>
              <div className="flex gap-2">
                <Select
                  className="min-w-0 flex-1"
                  showSearch
                  value={config.model || undefined}
                  placeholder="先拉取模型列表后选择"
                  loading={loadingModels}
                  options={modelSelectOptions}
                  optionFilterProp="label"
                  onChange={(value) =>
                    setConfig((current) => ({
                      ...current,
                      model: value,
                    }))
                  }
                  notFoundContent={
                    loadingModels ? <Spin size="small" /> : "暂无模型，请先拉取"
                  }
                />
                <Button loading={loadingModels} onClick={handleFetchModels}>
                  拉取模型
                </Button>
              </div>
              <Input
                className="mt-2"
                value={config.model}
                placeholder="也可手动填写模型名"
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                API Key
              </div>
              <Input.Password
                value={apiKeyDraft}
                placeholder={
                  config.hasApiKey
                    ? "留空则保留现有 Key，输入空字符串后保存可清空"
                    : "输入你的 API Key"
                }
                onChange={(event) => setApiKeyDraft(event.target.value)}
              />
              <div className="mt-1 text-xs text-neutral-400">
                {config.hasApiKey ? "服务端已保存 Key" : "当前未保存 Key"}
              </div>
              {config.hasApiKey && (
                <button
                  type="button"
                  className="mt-2 text-xs text-neutral-500 underline"
                  onClick={() => setApiKeyDraft(" ")}
                >
                  保存时清空现有 Key
                </button>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-800">笔记知识库</div>
                  <div className="text-xs text-neutral-500">
                    用你的笔记标题、标签和内容片段增强回答
                  </div>
                </div>
                <Switch
                  checked={config.enableKnowledgeBase}
                  onChange={(checked) =>
                    setConfig((current) => ({
                      ...current,
                      enableKnowledgeBase: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-800">允许联网</div>
                  <div className="text-xs text-neutral-500">
                    开启后会在回答前检索网页，并把来源附在回答下方
                  </div>
                </div>
                <Switch
                  checked={config.enableWeb}
                  onChange={(checked) =>
                    setConfig((current) => ({ ...current, enableWeb: checked }))
                  }
                />
              </div>
            </div>

            <Button
              type="primary"
              className="w-full"
              loading={savingConfig}
              onClick={handleSaveConfig}
            >
              保存 AI 配置
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
