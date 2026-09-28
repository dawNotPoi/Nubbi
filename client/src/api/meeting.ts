import { collectPages } from "./collect-pages";
import request, { Get, type ApiResponse } from "./request";
import type { PaginatedResult, PaginationParams } from "./pagination";
export interface MeetingType {
  _id: string;
  title: string;
  hostId: string;
  startTime: number | string | Date;
  createdAt: Date;
  duration: number;
  hasPassword?: boolean;
  endedAt?: string | Date | null;
  status?: "unreviewd" | "approved" | "rejected";
}

export interface MeetingComment {
  _id: string;
  roomId: string;
  meetingId: string;
  content: string;
  userId: string;
  name: string;
  avatar: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MeetingAccessResult {
  passed: boolean;
  reason:
    | "OK"
    | "INVALID_PASSWORD"
    | "NOT_FOUND"
    | "NOT_APPROVED"
    | "MEETING_ENDED";
  accessToken?: string;
  expiresInSeconds?: number;
}

/** @returns 逐页读取的会议列表，保留现有页面集合行为。 */
export async function getMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return collectPages((pagination) => Get<PaginatedResult<MeetingType>>("meeting/findMyMeeting", pagination));
}

/** @param data 会议表单。@returns 服务端返回的公开会议，供创建成功后邀请使用。 */
export async function createMeeting(
  data: Pick<MeetingType, "title" | "startTime" | "duration"> & {
    password?: string;
  }
): Promise<ApiResponse<MeetingType>> {
  return request<MeetingType>(`meeting/create`, data);
}

export async function deleteMeeting(
  _id: string,
): Promise<ApiResponse<unknown>> {
  return request(`meeting/delete?_id=${_id}`, {}, "delete");
}

/** @returns 逐页读取的会议列表，保留现有页面集合行为。 */
export async function getAllMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return collectPages((pagination) => Get<PaginatedResult<MeetingType>>("meeting/findAllMeeting", pagination));
}

export async function getMeetingList(
  pagination: PaginationParams = {},
): Promise<ApiResponse<PaginatedResult<MeetingType>>> {
  return Get<PaginatedResult<MeetingType>>("meeting/list", pagination);
}

export async function vetMeeting(
  id: string,
  status: "approved" | "rejected",
): Promise<ApiResponse<unknown>> {
  return request("meeting/vetMeeting", { id, status });
}

/** @returns 逐页读取的会议列表，保留现有页面集合行为。 */
export async function getAdminMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return getAllMeeting();
}

export async function getMeetingById(
  id: string,
): Promise<ApiResponse<MeetingType | null>> {
  return Get<MeetingType | null>("meeting/findById", { id });
}

/** @param id 主持的会议 ID。@returns 完整评论集合。 */
export async function getMeetingComments(
  id: string,
): Promise<ApiResponse<MeetingComment[]>> {
  return collectPages((pagination) => Get<PaginatedResult<MeetingComment>>("meeting/comments", { id, ...pagination }));
}

export async function validateMeetingAccess(
  id: string,
  password?: string,
): Promise<ApiResponse<MeetingAccessResult>> {
  return request<MeetingAccessResult>("meeting/validateAccess", {
    id,
    password: password ?? "",
  });
}
