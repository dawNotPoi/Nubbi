import logger from "@/common/logger";

export type MeetingRoomClosure = {
  roomId: string;
  endedBy: string;
};

type MeetingRoomClosureListener = (
  event: MeetingRoomClosure,
) => void | Promise<void>;

const closureListeners = new Set<MeetingRoomClosureListener>();

export const subscribeMeetingRoomClosure = (
  listener: MeetingRoomClosureListener,
): (() => void) => {
  closureListeners.add(listener);
  return (): void => {
    closureListeners.delete(listener);
  };
};

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
