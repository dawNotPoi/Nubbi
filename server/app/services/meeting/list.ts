import {
  buildPaginationResult,
  type PaginationInput,
} from "@/common/pagination";
import meeting from "@/models/meeting";
import { autoEndExpiredMeetings } from "./lifecycle";
import { serializeMeetingListItem } from "./list-dto";
import type {
  LegacyMeetingPageInput,
  LegacyMeetingPageResult,
  MeetingPageResult,
} from "./types";

export const getMeetingPage = async (
  pagination: PaginationInput,
): Promise<MeetingPageResult> => {
  const [items, total] = await Promise.all([
    meeting
      .find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit),
    meeting.countDocuments(),
  ]);
  const normalized = await autoEndExpiredMeetings(items);
  return buildPaginationResult(
    normalized.map(serializeMeetingListItem),
    total,
    pagination,
  );
};

export const getLegacyMeetingPage = async (
  input: LegacyMeetingPageInput,
): Promise<LegacyMeetingPageResult> => {
  const { page, pageSize, _id, hostId, status, title } = input;
  const filter = {
    ...(_id ? { _id } : {}),
    ...(hostId ? { hostId } : {}),
    ...(status === "approved"
      ? { status: { $in: ["approved", null] } }
      : status
        ? { status }
        : {}),
    ...(title ? { title } : {}),
  };
  const offset = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    meeting
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize),
    meeting.countDocuments(filter),
  ]);
  const normalized = await autoEndExpiredMeetings(items);

  return {
    data: normalized.map(serializeMeetingListItem),
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
