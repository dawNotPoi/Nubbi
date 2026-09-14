import { Check, FileText, ShieldCheck, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ApprovalRequest } from "../../types.ts";
import { Button } from "../../components/ui/button.tsx";

/**
 * 内联审批/评审卡片：不弹窗，直接在对话流中展示待评审内容与同意/拒绝操作。
 * @param props.approval 待处理的审批请求，为 null 时不渲染。
 * @param props.onDecision 用户决定回调，参数为是否同意。
 * @returns 内联评审卡片视图。
 */
export const InlineApproval = ({
  approval,
  onDecision,
}: {
  approval: ApprovalRequest | null;
  onDecision: (approved: boolean) => void;
}): React.JSX.Element | null => {
  if (!approval) return null;
  const review = approval.review;
  const hasReview = Boolean(review?.operation || review?.title || review?.content || review?.details?.length);

  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-start gap-3 border-b bg-muted/40 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {review?.operation ?? `允许调用 ${approval.server} / ${approval.tool}？`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {approval.server} / {approval.tool}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {review?.title ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">标题</p>
            <p className="mt-0.5 text-sm font-medium">{review.title}</p>
          </div>
        ) : null}

        {review?.content ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              笔记内容
            </p>
            <div className="prose prose-sm mt-1 max-h-72 max-w-none overflow-auto rounded-md bg-muted/60 p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{review.content}</ReactMarkdown>
            </div>
          </div>
        ) : null}

        {review?.details?.length ? (
          <dl className="space-y-1.5">
            {review.details.map((item) => (
              <div className="grid grid-cols-[100px_1fr] gap-2 text-xs" key={item.label}>
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0 break-words font-mono">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {!hasReview ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs leading-5">
            {JSON.stringify(approval.arguments, null, 2)}
          </pre>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t px-4 py-3">
        <Button onClick={() => onDecision(false)} variant="outline">
          <X />
          拒绝
        </Button>
        <Button onClick={() => onDecision(true)}>
          <Check />
          同意
        </Button>
      </div>
    </div>
  );
};
