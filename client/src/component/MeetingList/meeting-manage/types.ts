import type { MeetingType } from "@/api/meeting";

/** 审批决策：同意 / 拒绝 */
export type MeetingDecision = "approved" | "rejected";

/** 会议统计摘要 */
export type MeetingStats = {
  total: number;
  pending: number;
  ended: number;
};

/** 会议卡片操作回调集合 */
export type MeetingActions = {
  onVet: (id: string, status: MeetingDecision) => Promise<void>;
  onJoin: (id: string) => void;
  onViewComments: (meeting: MeetingType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
