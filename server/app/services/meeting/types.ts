import type { MeetingListItem } from "./list-dto";

export type LegacyMeetingPageInput = {
  page: number;
  pageSize: number;
  _id?: string;
  hostId?: string;
  status?: "unreviewd" | "approved" | "rejected";
  title?: string;
};

export type MeetingPageResult = {
  items: MeetingListItem[];
  total: number;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};

export type LegacyMeetingPageResult = {
  data: MeetingListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};
