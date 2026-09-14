import {
  createMeeting,
  getMeeting,
  getMeetingList,
  type MeetingType,
} from "@/api/meeting";
import { queryClient } from "@/utils/queryClient";

import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

/**
 * 分页拉取全部会议，返回按 _id 去重后的完整列表。
 * 用于会议管理页面，需要一次拿到所有会议数据。
 */
const getAllMeetingPages = async () => {
  const meetingsById = new Map<string, MeetingType>();
  const limit = 50;
  let offset = 0;

  while (true) {
    const response = await getMeetingList({ limit, offset });
    if (response.code === 0) {
      throw new Error(response.message || "Failed to load meetings");
    }

    const page = response.data;
    page.items.forEach((meeting) => meetingsById.set(meeting._id, meeting));
    if (!page.hasMore) return [...meetingsById.values()];
    if (page.nextOffset === null || page.nextOffset <= offset) {
      throw new Error("Invalid meeting pagination response");
    }
    offset = page.nextOffset;
  }
};

/** 近期会议列表查询 atom */
export const MeetingAtom = atomWithQuery(
  () => ({
    queryKey: ["meeting"],
    queryFn: async () => {
      const response = await getMeeting();
      return response.data || [];
    },
  }),
  () => queryClient
);

/** 全部会议列表查询 atom，分页聚合 */
export const AllMeetingAtom = atomWithQuery(
  () => ({
    queryKey: ["allMeeting"],
    queryFn: getAllMeetingPages,
  }),
  () => queryClient
);

/** 创建会议 mutation，成功后刷新近期和全部会议列表 */
export const createMeetingAtom = atomWithMutation(() => ({
  mutationFn: (
    meeting: Pick<MeetingType, "title" | "startTime" | "duration">
  ) => {
    return createMeeting(meeting);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["meeting"] });
    queryClient.invalidateQueries({ queryKey: ["allMeeting"] });
  },
}));
