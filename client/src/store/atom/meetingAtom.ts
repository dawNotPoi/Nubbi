import { createMeeting, getMeeting, MeetingType } from "@/api/meeting";
import { queryClient } from "@/AppProvider";

import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";

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

export const createMeetingAtom = atomWithMutation(() => ({
  mutationFn: (
    meeting: Pick<MeetingType, "title" | "startTime" | "duration">
  ) => {
    return createMeeting(meeting);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["meeting"] });
  },
}));
