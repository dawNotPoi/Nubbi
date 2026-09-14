import { httpError } from "@/common/http-error";
import type { PaginationInput } from "@/common/pagination";
import type { AuthenticatedUser } from "@/lib/authUser";
import meeting from "@/models/meeting";
import meetingComment from "@/models/meetingComment";
import {
  autoEndExpiredMeeting,
  autoEndExpiredMeetings,
} from "@/services/meeting/lifecycle";
import {
  serializeMeetingListItem,
  type MeetingListItem,
} from "@/services/meeting/list-dto";
import { getLegacyMeetingPage, getMeetingPage } from "@/services/meeting/list";
import type { LegacyMeetingPageInput } from "@/services/meeting/types";
import { serializeMeetingComment } from "./comment-dto";
import type { MeetingCommentInfo } from "./types";

export async function findMyMeetings(
  actor: AuthenticatedUser,
): Promise<MeetingListItem[]> {
  const items = await meeting.find({ hostId: actor.id });
  const normalized = await autoEndExpiredMeetings(items);
  return normalized.map(serializeMeetingListItem);
}

export async function findMeetingPage(
  pagination: PaginationInput,
): Promise<Awaited<ReturnType<typeof getMeetingPage>>> {
  return getMeetingPage(pagination);
}

export async function findLegacyMeetingPage(
  input: LegacyMeetingPageInput,
): Promise<Awaited<ReturnType<typeof getLegacyMeetingPage>>> {
  return getLegacyMeetingPage(input);
}

export async function findAllMeetings(): Promise<MeetingListItem[]> {
  const items = await meeting.find().sort({ createdAt: -1 });
  const normalized = await autoEndExpiredMeetings(items);
  return normalized.map(serializeMeetingListItem);
}

export async function findMeetingById(
  meetingId: string,
): Promise<MeetingListItem | null> {
  const item = await meeting.findById(meetingId);
  if (!item) return null;
  return serializeMeetingListItem(await autoEndExpiredMeeting(item));
}

export async function findHostedMeetingComments(
  actor: AuthenticatedUser,
  meetingId: string,
): Promise<MeetingCommentInfo[]> {
  const ownedMeeting = await meeting.exists({
    _id: meetingId,
    hostId: actor.id,
  });
  if (!ownedMeeting) throw httpError(404, "Meeting not found");

  const comments = await meetingComment
    .find({ roomId: meetingId })
    .sort({ createdAt: 1 });
  return comments.map(serializeMeetingComment);
}
