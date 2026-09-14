import type { VideoRoomUser } from "../types";

export type MentionMatch = {
  keyword: string;
  start: number;
  end: number;
};

export type MentionUser = Pick<
  VideoRoomUser,
  "peerId" | "userId" | "name" | "image"
>;

export const getMentionUsers = (
  currentUserName: string,
  currentUserAvatar: string,
  roomUsers: VideoRoomUser[],
): MentionUser[] => {
  const mergedUsers: MentionUser[] = [
    {
      peerId: "local-user",
      userId: "local-user",
      name: currentUserName,
      image: currentUserAvatar,
    },
    ...roomUsers,
  ];
  const userMap = new Map<string, MentionUser>();
  mergedUsers.forEach((user) => {
    const key = user.userId || user.peerId || user.name;
    if (!userMap.has(key)) userMap.set(key, user);
  });
  return Array.from(userMap.values());
};

export const getMentionMatch = (
  draft: string,
  cursorIndex: number,
): MentionMatch | null => {
  const beforeCursor = draft.slice(0, cursorIndex);
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (!match) return null;
  return {
    keyword: match[2] || "",
    start: beforeCursor.length - match[2].length - 1,
    end: beforeCursor.length,
  };
};

export const getMentionSuggestions = (
  users: MentionUser[],
  match: MentionMatch | null,
): MentionUser[] => {
  if (!match) return [];
  const keyword = match.keyword.trim().toLowerCase();
  if (!keyword) return users;
  return users.filter((user) =>
    user.name.toLowerCase().includes(keyword),
  );
};

export const getCommentAudienceLabel = (roomUserCount: number): string =>
  `发送至 会议中的所有人 · ${roomUserCount + 1} 人`;

export const getCommentPlaceholder = (
  roomUsers: VideoRoomUser[],
): string => {
  const latestUser = roomUsers[0]?.name;
  return latestUser
    ? `输入评论，可 @${latestUser} 或记录会议结论…`
    : "输入评论，像 Notion 一样沉淀会议记录…";
};

export const formatCommentTime = (value: string): string =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
