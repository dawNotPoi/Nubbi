import logger from "@/common/logger";

/** 会议房间关闭事件 */
export type MeetingRoomClosure = {
  roomId: string;
  endedBy: string;
};

/** 会议房间关闭事件的监听器类型 */
type MeetingRoomClosureListener = (
  event: MeetingRoomClosure,
) => void | Promise<void>;

const closureListeners = new Set<MeetingRoomClosureListener>();

/** 订阅会议房间关闭事件，返回取消订阅函数 */
export const subscribeMeetingRoomClosure = (
  listener: MeetingRoomClosureListener,
): (() => void) => {
  closureListeners.add(listener);
  return (): void => {
    closureListeners.delete(listener);
  };
};

/** 通知所有监听者会议房间已关闭，单个监听失败不影响其他监听者 */
export const notifyMeetingRoomClosure = (
  event: MeetingRoomClosure,
): Promise<void> =>
  Promise.all(
    [...closureListeners].map((listener) =>
      Promise.resolve(listener(event)).catch((error: unknown) => {
        logger.error("会议房间关闭通知处理失败", {
          roomId: event.roomId,
          error,
        });
      }),
    ),
  ).then(() => undefined);
