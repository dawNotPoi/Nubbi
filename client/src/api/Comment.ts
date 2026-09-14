import { Get } from "./request";

export async function deleteComment(id: string) {
    return Get(`comment/delete`, { id });
}


export async function getAllComment() {
    return Get(`comment/findAllComment`);
}
