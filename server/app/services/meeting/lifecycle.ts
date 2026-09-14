import meeting from "@/models/meeting";

/** 会议生命周期相关的可读字段类型 */
type MeetingLifecycleItem = {
  _id?: unknown;
  startTime?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  duration?: number | null;
  endedAt?: string | number | Date | null;
  toObject?: () => Record<string, unknown>;
};

/** 计算会议结束时间戳（开始时间 + 时长），无效时返回 null */
export const getMeetingEndTimestamp = (
  item: MeetingLifecycleItem,
): number | null => {
  const startTime = item.startTime || item.createdAt;
  if (!startTime || !item.duration) return null;

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return null;
  return start + item.duration * 60 * 1000;
};

/** 判断会议是否已超时（未显式结束时按开始时间 + 时长计算） */
const isMeetingExpired = (item: MeetingLifecycleItem) => {
  if (item.endedAt) return false;
  const endTimestamp = getMeetingEndTimestamp(item);
  return endTimestamp !== null && Date.now() >= endTimestamp;
};

const toLifecycleItem = (item: unknown): MeetingLifecycleItem =>
  item as MeetingLifecycleItem;

const toPlainObject = (item: MeetingLifecycleItem) =>
  typeof item.toObject === "function" ? item.toObject() : { ...item };

/** 批量自动结束已超时的会议并返回更新后的列表 */
export const autoEndExpiredMeetings = async <T>(items: T[]): Promise<T[]> => {
  const meetings = items.map(toLifecycleItem);
  const now = new Date();
  const expiredIds = new Set(
    meetings
      .filter(isMeetingExpired)
      .map((item) => String(item._id)),
  );

  if (expiredIds.size > 0) {
    await meeting.updateMany(
      { _id: { $in: [...expiredIds] }, endedAt: null },
      { $set: { endedAt: now } },
    );
  }

  return meetings.map((item) => {
    if (!expiredIds.has(String(item._id))) return item as T;
    const plain = toPlainObject(item);
    return { ...plain, endedAt: plain.endedAt || now } as T;
  });
};

/** 自动结束单个已超时的会议并返回更新后的对象 */
export const autoEndExpiredMeeting = async <T>(value: T): Promise<T> => {
  if (!value) return value;
  const item = toLifecycleItem(value);
  if (!isMeetingExpired(item)) return value;

  const now = new Date();
  await meeting.updateOne(
    { _id: item._id, endedAt: null },
    { $set: { endedAt: now } },
  );
  const plain = toPlainObject(item);
  return { ...plain, endedAt: plain.endedAt || now } as T;
};
