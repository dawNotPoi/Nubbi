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

export async function getMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return Get<MeetingType[]>(`meeting/findMyMeeting`);
}

export async function createMeeting(
  data: Pick<MeetingType, "title" | "startTime" | "duration"> & {
    password?: string;
  }
): Promise<ApiResponse<unknown>> {
  return request(`meeting/create`, data);
}

export async function deleteMeeting(
  _id: string,
): Promise<ApiResponse<unknown>> {
  return request(`meeting/delete?_id=${_id}`, {}, "delete");
}

export async function getAllMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return Get<MeetingType[]>("meeting/findAllMeeting");
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

export async function getAdminMeeting(): Promise<ApiResponse<MeetingType[]>> {
  return Get<MeetingType[]>(`meeting/findAllMeeting`, { hostId: "dawn" });
}

export async function getMeetingById(
  id: string,
): Promise<ApiResponse<MeetingType | null>> {
  return Get<MeetingType | null>("meeting/findById", { id });
}

export async function getMeetingComments(
  id: string,
): Promise<ApiResponse<MeetingComment[]>> {
  return Get<MeetingComment[]>("meeting/comments", { id });
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
