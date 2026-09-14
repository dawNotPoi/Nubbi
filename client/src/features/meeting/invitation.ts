/** 邀请只包含公开的会议信息，不包含密码、凭据或其他用户身份。 */
export type MeetingInvitation = { id: string; title: string; startTime?: string | number | Date };

/** @param meeting 公开会议信息。@param origin 当前站点来源。@returns 可复制的邀请文本。 */
export function buildMeetingInvitation(meeting: MeetingInvitation, origin: string): string {
  const url = new URL(`/meeting/${encodeURIComponent(meeting.id)}`, origin);
  const date = meeting.startTime === undefined ? null : new Date(meeting.startTime);
  const time = date && !Number.isNaN(date.getTime()) ? `时间：${date.toLocaleString("zh-CN")}\n` : "";
  return `邀请你参加：${meeting.title || "会议"}\n${time}会议链接：${url.href}\n请登录后加入；若设有密码，请向主持人单独获取。`;
}
