import type { MeetingType } from "@/api/meeting";

export type MeetingDecision = "approved" | "rejected";

export type MeetingStats = {
  total: number;
  pending: number;
  ended: number;
};

export type MeetingActions = {
  onVet: (id: string, status: MeetingDecision) => Promise<void>;
  onJoin: (id: string) => void;
  onViewComments: (meeting: MeetingType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
