import request, { Get } from "./request";
export interface MeetingType {
  _id: string;
  title: string;
  hostId: string;
  startTime: number;
  createdAt: Date;
  duration: number;
  password?: string;
}

export interface MeetingAccessResult {
  passed: boolean;
  reason: "OK" | "INVALID_PASSWORD" | "NOT_FOUND";
}

export async function getMeeting() {
  return Get<MeetingType[]>(`meeting/findMyMeeting`);
}

export async function createMeeting(
  data: Pick<MeetingType, "title" | "startTime" | "duration"> & {
    password?: string;
  }
) {
  return request(`meeting/create`, data);
}

export async function deleteMeeting(_id: string) {
  return request(`meeting/delete?_id=${_id}`, {}, "delete");
}

export async function getAllMeeting() {
  return Get<MeetingType[]>("meeting/findAllMeeting");
}

export async function vetMeeting(id: string, status: "approved" | "rejected") {
  return request("meeting/vetMeeting", { id, status });
}

export async function getAdminMeeting() {
  return Get<MeetingType[]>(`meeting/findAllMeeting`, { hostId: "dawn" });
}

export async function getMeetingById(id: string) {
  return Get<MeetingType | null>("meeting/findById", { id });
}

export async function validateMeetingAccess(id: string, password?: string) {
  return request<MeetingAccessResult>("meeting/validateAccess", {
    id,
    password: password ?? "",
  });
}
