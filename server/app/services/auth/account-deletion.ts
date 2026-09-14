import logger from "@/common/logger";
import { waitForAll } from "@/common/promises";
import { db } from "@/lib/db";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import Image from "@/models/image";
import Meeting from "@/models/meeting";
import MeetingComment from "@/models/meetingComment";
import Note from "@/models/note";
import NotePurgeTask from "@/models/notePurgeTask";
import Summary from "@/models/summary";
import Tag from "@/models/tag";
import {
  beginAccountDeletion,
  cancelAccountDeletion,
} from "@/services/auth/account-mutation-guard";
import { withFileFolderStructureLock } from "@/services/fileManagement/structureLock";
import { deleteUserUploadTasksUnlocked } from "@/services/fileUpload/taskLifecycle";
import {
  enqueueStorageCleanup,
  processStorageCleanupUnlocked,
} from "@/services/storageCleanupQueue";
import {
  enqueueImageCleanup,
  processImageCleanup,
} from "@/services/image/cleanup";
import {
  beginMeetingClosures,
  cancelMeetingClosures,
} from "@/services/meeting/mutation-guard";
import { notifyMeetingRoomClosure } from "@/services/meeting/room-events";
import { ObjectId } from "mongodb";

type AuthUserDocument = {
  _id?: ObjectId | string;
  id?: string;
};

type AccountDeletionProgress = {
  meetingIds: string[];
  accountCommitted: boolean;
};

/** 删除用户全部文件：先记录存储路径，再删记录并清理物理文件 */
const deleteUserFiles = async (userId: string): Promise<void> => {
  await withFileFolderStructureLock(userId, async () => {
    const userFiles = await File.find({ ownerId: userId })
      .select("storagePath")
      .lean();
    const storagePaths = userFiles.map((file) => file.storagePath);

    await enqueueStorageCleanup(userId, storagePaths);
    await deleteUserUploadTasksUnlocked(userId);
    await waitForAll(
      [
        Folder.deleteMany({ ownerId: userId }),
        File.deleteMany({ ownerId: userId }),
      ],
      "账号文件记录清理未全部完成",
    );
    await processStorageCleanupUnlocked(userId, storagePaths);
  });
};

/** 删除账号全部数据（无注销互斥保护，供已持锁调用方使用） */
const deleteUserAccountDataUnlocked = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}, progress: AccountDeletionProgress): Promise<void> => {
  const mongoDb = await db;
  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 先保留关联主键，避免删除 Note 和 Meeting 后无法定位从属数据。
  const [noteIds, purgeTasks, meetingIds, ownedImages] = await Promise.all([
    Note.distinct("_id", { userId }),
    NotePurgeTask.find({ userId }).select("targetIds").lean(),
    Meeting.distinct("_id", { hostId: userId }),
    Image.find({
      ownerId: userId,
      remotePath: { $type: "string" },
      remoteSha: { $type: "string" },
    })
      .select("remotePath remoteSha")
      .lean(),
  ]);
  const summaryNoteIds = [
    ...new Map(
      [...noteIds, ...purgeTasks.flatMap((task) => task.targetIds)].map(
        (noteId) => [String(noteId), noteId],
      ),
    ).values(),
  ];
  const roomIds = meetingIds.map(String);
  await beginMeetingClosures(roomIds);
  progress.meetingIds = roomIds;
  await Promise.all(
    roomIds.map((roomId) =>
      notifyMeetingRoomClosure({ roomId, endedBy: userId }),
    ),
  );
  await enqueueImageCleanup(
    userId,
    ownedImages.flatMap((item) =>
      item.remotePath && item.remoteSha
        ? [{ remotePath: item.remotePath, remoteSha: item.remoteSha }]
        : [],
    ),
  );

  await deleteUserFiles(userId);
  await Summary.deleteMany({ noteId: { $in: summaryNoteIds } });
  await Image.deleteMany({ ownerId: userId });
  await MeetingComment.deleteMany({
      $or: [
        { userId },
        { meetingId: { $in: meetingIds } },
        { roomId: { $in: roomIds } },
      ],
  });
  await Meeting.deleteMany({ hostId: userId });
  await Note.deleteMany({ userId });
  await NotePurgeTask.deleteMany({ userId });
  await Tag.deleteMany({ userId });

  const userIdObject = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  const userDeleteFilters: Array<Partial<AuthUserDocument>> = [
    { id: userId },
    { _id: userId },
    ...(userIdObject ? [{ _id: userIdObject }] : []),
  ];

  await mongoDb.collection<AuthUserDocument>("user").deleteOne({
    $or: userDeleteFilters,
  });
  progress.accountCommitted = true;

  await waitForAll(
    [
      mongoDb.collection("apikey").deleteMany({ userId }),
      mongoDb.collection("session").deleteMany({ userId }),
      mongoDb.collection("account").deleteMany({ userId }),
      mongoDb
        .collection("verification")
        .deleteMany({
          $or: [
            { identifier: normalizedEmail },
            { value: userId },
          ],
        }),
      mongoDb
        .collection("email_verification_codes")
        .deleteMany({ email: normalizedEmail }),
      mongoDb
        .collection("password_reset_codes")
        .deleteMany({ email: normalizedEmail }),
      mongoDb
        .collection("register_verification_codes")
        .deleteMany({ email: normalizedEmail }),
      mongoDb.collection("account_deletion_codes").deleteMany({ userId }),
    ],
    "账号认证残留清理未全部完成",
  ).catch((error: unknown) => {
    logger.warn("账号已注销，但部分认证残留清理失败", { userId, error });
  });
  await processImageCleanup(userId).catch((error: unknown) => {
    logger.warn("账号注销后的图片清理暂未完成，将由后台任务重试", {
      userId,
      error,
    });
  });
};

/** 删除账号全部数据：在注销互斥锁保护下执行，失败时回滚注销态 */
export const deleteUserAccountData = async (input: {
  userId: string;
  email: string;
}): Promise<void> => {
  const progress: AccountDeletionProgress = {
    meetingIds: [],
    accountCommitted: false,
  };
  await beginAccountDeletion(input.userId);
  try {
    await deleteUserAccountDataUnlocked(input, progress);
  } catch (error) {
    if (!progress.accountCommitted) {
      cancelAccountDeletion(input.userId);
    }
    throw error;
  } finally {
    cancelMeetingClosures(progress.meetingIds);
  }
};
