import { randomUUID } from "node:crypto";
import type { AgentEvent } from "./types.js";

type ApprovalInput = {
  threadId: string;
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
  emit: (event: AgentEvent) => void;
};

type PendingApproval = {
  threadId: string;
  settle: (approved: boolean) => void;
  timeout: NodeJS.Timeout;
};

const pending = new Map<string, PendingApproval>();
// 审批有效期：用户长时间不操作时自动按“拒绝”处理，避免 Run 无限等待。
const approvalTimeoutMs = 5 * 60 * 1000;

/**
 * 发起一次工具审批并挂起等待用户决定。
 * 返回 approvalId 供外部通过 HTTP 回调决定，超时或取消都归为拒绝。
 */
export const requestApproval = async (input: ApprovalInput): Promise<{
  approvalId: string;
  approved: boolean;
}> => {
  const approvalId = randomUUID();
  const expiresAt = new Date(Date.now() + approvalTimeoutMs).toISOString();
  const approved = await new Promise<boolean>((resolve) => {
    let settled = false;
    // settle 只允许执行一次：先到先得，防止超时与用户决定竞态。
    const settle = (decision: boolean) => {
      if (settled) return;
      settled = true;
      const item = pending.get(approvalId);
      if (item) clearTimeout(item.timeout);
      pending.delete(approvalId);
      input.emit({ type: "approval-resolved", approvalId, approved: decision });
      resolve(decision);
    };
    const timeout = setTimeout(() => settle(false), approvalTimeoutMs);
    pending.set(approvalId, { threadId: input.threadId, settle, timeout });
    input.emit({
      type: "approval-request",
      approvalId,
      server: input.server,
      tool: input.tool,
      arguments: input.arguments,
      expiresAt,
    });
  });
  return { approvalId, approved };
};

/** 由 HTTP 审批接口调用，找到对应的挂起审批并落地用户决定。 */
export const resolveApproval = (
  approvalId: string,
  approved: boolean,
): "resolved" | "missing" => {
  const item = pending.get(approvalId);
  if (!item) return "missing";
  item.settle(approved);
  return "resolved";
};

/** 结束某线程（Run）下所有挂起审批，用于取消生成或 Run 结束时清理。 */
export const cancelThreadApprovals = (threadId: string): void => {
  [...pending.entries()]
    .filter(([, item]) => item.threadId === threadId)
    .forEach(([, item]) => item.settle(false));
};
