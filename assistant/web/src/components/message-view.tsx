import { Bot, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";
import type { Message, MessagePart } from "../types";

/** 工具执行卡片：可展开查看参数/结果，运行中显示占位文案。 */
const ToolCard = ({ part }: {
  part: Extract<MessagePart, { type: "tool" }>;
}) => (
  <details className="mb-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
    <summary className="flex cursor-pointer list-none items-center gap-2">
      <span className="size-2 rounded-full bg-primary" />
      <span className="font-medium">{part.server} / {part.tool}</span>
      <ChevronDown className="ml-auto size-3.5" />
    </summary>
    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">
      {part.status === "running" ? "正在执行..." : part.result}
    </pre>
  </details>
);

export const MessageView = ({ message }: { message: Message }) => {
  const user = message.role === "user";
  return (
    <article className={cn("flex w-full", user && "justify-end")}>
      <div className={cn(
        "min-w-0",
        user ? "max-w-[86%] rounded-md bg-muted px-4 py-2.5" : "w-full",
      )}>
        {message.parts.map((part, index) => {
          const key = `${message.id}-${part.type}-${index}`;
          if (part.type === "text") {
            return (
              <div className="prose prose-sm max-w-none break-words" key={key}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              </div>
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
          return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" key={key}>{part.message}</p>;
        })}
        {!message.parts.length ? (
          <div className="flex items-center gap-1 py-2 text-muted-foreground">
            {[0, 1, 2].map((index) => <span className="size-1.5 animate-pulse rounded-full bg-current" key={index} />)}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export const EmptyState = () => (
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
