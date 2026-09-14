import { ShieldCheck, X } from "lucide-react";
import type { ApprovalRequest } from "../types";
import { Button } from "./ui/button";

/** 工具审批弹窗：展示服务器、工具与参数，让用户决定是否允许一次。 */
export const ApprovalDialog = ({
  approval,
  onDecision,
}: {
  approval: ApprovalRequest | null;
  onDecision: (approved: boolean) => void;
}) => {
  if (!approval) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">允许调用 MCP 工具？</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {approval.server} / {approval.tool}
            </p>
          </div>
          <Button aria-label="拒绝" onClick={() => onDecision(false)} size="icon" variant="ghost">
            <X />
          </Button>
        </div>
        <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
          {JSON.stringify(approval.arguments, null, 2)}
        </pre>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => onDecision(false)} variant="outline">拒绝</Button>
          <Button onClick={() => onDecision(true)}>允许一次</Button>
        </div>
      </div>
    </div>
  );
};
