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
const approvalTimeoutMs = 5 * 60 * 1000;

export const requestApproval = async (input: ApprovalInput): Promise<{
  approvalId: string;
  approved: boolean;
}> => {
  const approvalId = randomUUID();
  const expiresAt = new Date(Date.now() + approvalTimeoutMs).toISOString();
  const approved = await new Promise<boolean>((resolve) => {
    let settled = false;
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

export const resolveApproval = (
  approvalId: string,
  approved: boolean,
): "resolved" | "missing" => {
  const item = pending.get(approvalId);
  if (!item) return "missing";
  item.settle(approved);
  return "resolved";
};

export const cancelThreadApprovals = (threadId: string): void => {
  [...pending.entries()]
    .filter(([, item]) => item.threadId === threadId)
    .forEach(([, item]) => item.settle(false));
};
