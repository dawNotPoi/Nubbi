import { Bot, CheckCircle2, ChevronDown, Clock3, Loader2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatUserInput } from "@nubbi/assistant-shared/client";
import { cn } from "../../lib/utils.ts";
import type { Message, MessagePart } from "../../types.ts";

/**
 * 把毫秒耗时格式化为可读文本，不足 1 秒显示毫秒，否则显示秒。
 * @param milliseconds 工具实际执行耗时。
 * @returns 格式化后的耗时文本。
 */
const formatDuration = (milliseconds: number): string =>
  milliseconds < 1000 ? milliseconds + "ms" : (milliseconds / 1000).toFixed(1) + "s";

/**
 * 折叠区标题：参数与结果共用，只读展示用途的小节头部。
 * @param props.label 小节名称。
 * @returns 折叠区头部视图。
 */
const CollapseHeader = ({ label }: { label: string }) => (
  <span className="flex items-center gap-1 text-muted-foreground">
    {label}
    <ChevronDown className="size-3" />
  </span>
);

/**
 * 工具执行卡片：状态标记（运行中/成功/失败）+ 耗时 + 可折叠参数与结果。
 * 参考 DeepSeek Harness 的消息流样式，运行中显示进度标记。
 * @param props.part 类型为 tool 的消息内容块。
 * @returns 可展开的工具卡片视图。
 */
const ToolCard = ({ part }: { part: Extract<MessagePart, { type: "tool" }> }) => {
  const running = part.status === "running";
  const failed = part.status === "done" && part.success === false;
  return (
    <details className="mb-2 overflow-hidden rounded-md border bg-muted/40 text-xs" open={running}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-500" />
        ) : failed ? (
          <XCircle className="size-3.5 shrink-0 text-red-500" />
        ) : (
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <span className="min-w-0 truncate font-medium">
          {part.server} / {part.tool}
        </span>
        {!running && part.durationMs !== undefined && (
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
            <Clock3 className="size-3" />
            {formatDuration(part.durationMs)}
          </span>
        )}
        <ChevronDown className="ml-auto size-3.5 shrink-0" />
      </summary>
      {running ? (
        <p className="px-3 pb-2 text-muted-foreground">正在执行...</p>
      ) : (
        <div className="space-y-1.5 border-t px-3 py-2">
          <details>
            <summary className="cursor-pointer list-none">
              <CollapseHeader label="参数" />
            </summary>
            <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-muted-foreground">
              {JSON.stringify(part.arguments, null, 2)}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer list-none">
              <CollapseHeader label="结果" />
            </summary>
            <pre
              className={cn(
                "mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2",
                failed ? "text-red-600" : "text-muted-foreground",
              )}
            >
              {part.result}
            </pre>
          </details>
        </div>
      )}
    </details>
  );
};

/**
 * 单条消息渲染：用户消息右对齐纯文本，助手消息按 parts 分块渲染。
 * @param props.message 要渲染的消息。
 * @returns 消息视图。
 */
export const MessageView = ({ message }: { message: Message }): React.JSX.Element => {
  const user = message.role === "user";
  return (
    <article className={cn("flex w-full", user && "justify-end")}>
      <div className={cn("min-w-0", user ? "max-w-[86%] rounded-md bg-muted px-4 py-2.5" : "w-full")}>
        {!user && message.model ? <p className="mb-2 text-xs text-muted-foreground">本次模型：{message.model}</p> : null}
        {message.parts.map((part, index) => {
          const key = `${message.id}-${part.type}-${index}`;
          if (part.type === "user-input") return <p key={key} className="mb-2 whitespace-pre-wrap rounded-md border p-3 text-sm">{formatUserInput(part)}</p>;
          if (part.type === "text") {
            return (
              <div className="prose prose-sm max-w-none break-words" key={key}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              </div>
            );
          }
          if (part.type === "reasoning") {
            return (
              <details className="mb-2 rounded-md border bg-amber-500/5 text-xs" key={key}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-muted-foreground">
                  <Sparkles className="size-3.5 text-amber-600" />
                  思考过程
                  <ChevronDown className="ml-auto size-3.5" />
                </summary>
                <p className="whitespace-pre-wrap border-t px-3 py-2 leading-5 text-muted-foreground">{part.text}</p>
              </details>
            );
          }
          if (part.type === "skill") {
            return (
              <div className="mb-2 flex gap-2 rounded-md border p-3 text-xs" key={key}>
                <Sparkles className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">{part.name}</p>
                  <p className="mt-0.5 text-muted-foreground">{part.description}</p>
                </div>
              </div>
            );
          }
          if (part.type === "tool") return <ToolCard key={key} part={part} />;
          if (part.type === "approval") {
            return (
              <div className="mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs" key={key}>
                <ShieldCheck className="size-4 text-primary" />
                {part.approved ? "已允许" : "已拒绝"} {part.server} / {part.tool}
              </div>
            );
          }
          return (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" key={key}>
              {part.message}
            </p>
          );
        })}
        {!message.parts.length ? (
          <div className="flex items-center gap-1 py-2 text-muted-foreground">
            {[0, 1, 2].map((index) => (
              <span className="size-1.5 animate-pulse rounded-full bg-current" key={index} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
};

/**
 * 空会话占位视图，用于尚无消息时引导用户。
 * @returns 空状态视图。
 */
export const EmptyState = (): React.JSX.Element => (
  <div className="grid min-h-full place-items-center px-6 py-12">
    <div className="max-w-sm text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-md bg-accent text-accent-foreground">
        <Bot className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">今天想做什么？</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        进行通用对话，并按需使用 Skill 和已配置的 MCP 工具。
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" />
        独立个人助手
      </div>
    </div>
  </div>
);
