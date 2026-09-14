import {
  createMeeting,
  getMeeting,
  getMeetingList,
  type MeetingType,
} from "@/api/meeting";
import { queryClient } from "@/utils/queryClient";

import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

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

export const AllMeetingAtom = atomWithQuery(
  () => ({
    queryKey: ["allMeeting"],
    queryFn: getAllMeetingPages,
  }),
  () => queryClient
);

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
