import { MeetingType } from "../type/Meeting";
import request, { Get } from "./request";

export async function getMeeting() {
    return request(`meeting/findByPage`);
}

export async function createMeeting(data: {
    title: string, startTime: string, duration: number, hostId: string
}) {
    return request(`meeting/create`, data);
}

export async function deleteMeeting(_id: string) {
    return request(`meeting/delete?_id=${_id}`, {}, "delete");
}

export async function getAllMeeting() {
    return Get<MeetingType[]>("meeting/findAllMeeting");
}

export async function vetMeeting(id: string, status: "approved" | "rejected") {
    return request('meeting/vetMeeting', { id, status });
}

export async function getAdminMeeting() {
    return Get<MeetingType[]>(`meeting/findAllMeeting`, { hostId: "dawn" });
}