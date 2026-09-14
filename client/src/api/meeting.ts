import request, { Get } from "./request";
export interface MeetingType {
  _id: string;
  title: string;
  hostId: string;
  startTime: number;
  createdAt: Date;
  duration: number;
}

export async function getMeeting() {
  return Get<MeetingType[]>(`meeting/findMyMeeting`);
}

export async function createMeeting(
  data: Pick<MeetingType, "title" | "startTime" | "duration">
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
