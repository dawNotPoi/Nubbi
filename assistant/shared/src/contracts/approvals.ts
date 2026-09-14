/** 审批卡片的结构化评审内容，便于前端以友好形式展示，而不是直接抛 JSON。 */
export type ApprovalReview = {
  operation: string;
  title?: string;
  content?: string;
  details?: Array<{ label: string; value: string }>;
};

/** 一次性工具审批展示数据；审批只对指定 ID 生效。 */
export type ApprovalRequest = {
  type: "approval-request";
  approvalId: string;
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
  expiresAt: string;
  review?: ApprovalReview;
};
