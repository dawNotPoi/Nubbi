import type { UploadSession } from "./model";

const SESSIONS_KEY = "nubbi_upload_sessions_v2";
const LEGACY_SESSIONS_KEY = "nubbi_upload_sessions";

const storageAvailable = () => typeof window !== "undefined";

type LegacyUploadSession = Omit<UploadSession, "ownerId">;
type StoredUploadSession = UploadSession | LegacyUploadSession;

/**
 * 把持久化未知值收窄为上传会话，不在此处推断遗留记录归属。
 * @param value LocalStorage 中解析出的未知值。
 * @returns 字段完整的持久化记录，否则为 null。
 */
const parseStoredSession = (value: unknown): StoredUploadSession | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.uploadId !== "string" ||
    typeof record.hash !== "string" ||
    typeof record.name !== "string" ||
    typeof record.size !== "number" ||
    record.size <= 0 ||
    typeof record.chunkSize !== "number" ||
    typeof record.totalChunks !== "number" ||
    typeof record.expiresAt !== "string"
  ) {
    return null;
  }
  const common: LegacyUploadSession = {
    uploadId: record.uploadId,
    hash: record.hash,
    name: record.name,
    size: record.size,
    folderId: typeof record.folderId === "string" ? record.folderId : undefined,
    folderName:
      typeof record.folderName === "string" ? record.folderName : undefined,
    chunkSize: record.chunkSize,
    totalChunks: record.totalChunks,
    expiresAt: record.expiresAt,
  };
  return typeof record.ownerId === "string" && record.ownerId
    ? { ...common, ownerId: record.ownerId }
    : common;
};

/** @returns 全部格式有效的持久化记录，包含尚未确认归属的遗留记录。 */
const readStoredSessions = (): StoredUploadSession[] => {
  if (!storageAvailable()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]") as unknown;
    return Array.isArray(value)
      ? value.flatMap((item) => {
          const session = parseStoredSession(item);
          return session ? [session] : [];
        })
      : [];
  } catch {
    return [];
  }
};

/**
 * @param sessions 待保存的账号会话与未确认遗留记录。
 * @returns 无返回值。
 */
const writeSessions = (sessions: StoredUploadSession[]): void => {
  if (!storageAvailable()) return;
  if (sessions.length === 0) {
    window.localStorage.removeItem(SESSIONS_KEY);
    return;
  }
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

/** @param ownerId 当前账号 ID。@returns 只属于该账号的上传会话。 */
export const getUploadSessions = (ownerId: string): UploadSession[] =>
  readStoredSessions().filter(
    (session): session is UploadSession =>
      "ownerId" in session && session.ownerId === ownerId,
  );

/** @returns 尚未确认归属的遗留上传会话；调用方不得在确认前显示文件名。 */
export const getLegacyUploadSessions = (): LegacyUploadSession[] =>
  readStoredSessions().filter(
    (session): session is LegacyUploadSession => !("ownerId" in session),
  );

/** @param session 当前已认证账号的新上传会话。@returns 无返回值。 */
export const saveUploadSession = (session: UploadSession): void => {
  const sessions = readStoredSessions().filter(
    (item) => item.uploadId !== session.uploadId,
  );
  writeSessions([...sessions, session]);
};

/**
 * 认证探针成功后给单条遗留记录回填 ownerId。
 * @param ownerId 服务端认证上下文确认的当前账号 ID。
 * @param uploadId 已成功查询的上传任务 ID。
 * @returns 迁移后的账号会话；记录不存在时为 null。
 */
export const migrateLegacyUploadSession = (
  ownerId: string,
  uploadId: string,
): UploadSession | null => {
  let migrated: UploadSession | null = null;
  const sessions = readStoredSessions().map((session) => {
    if ("ownerId" in session || session.uploadId !== uploadId) return session;
    migrated = { ...session, ownerId };
    return migrated;
  });
  if (migrated) writeSessions(sessions);
  return migrated;
};

/** @param ownerId 当前账号 ID。@param uploadId 上传任务 ID。@returns 无返回值。 */
export const removeUploadSession = (ownerId: string, uploadId: string): void => {
  writeSessions(
    readStoredSessions().filter(
      (session) =>
        !("ownerId" in session) ||
        session.ownerId !== ownerId ||
        session.uploadId !== uploadId,
    ),
  );
};

/** @param uploadId 已由认证探针确认完成的遗留任务 ID。@returns 无返回值。 */
export const removeLegacyUploadSession = (uploadId: string): void => {
  writeSessions(
    readStoredSessions().filter(
      (session) => "ownerId" in session || session.uploadId !== uploadId,
    ),
  );
};

/**
 * @param ownerId 当前账号 ID。
 * @param hash 文件哈希。
 * @param size 文件大小。
 * @returns 无返回值。
 */
export const removeUploadSessionsByFingerprint = (
  ownerId: string,
  hash: string,
  size: number,
): void => {
  writeSessions(
    readStoredSessions().filter(
      (session) =>
        !("ownerId" in session) ||
        session.ownerId !== ownerId ||
        session.hash !== hash ||
        session.size !== size,
    ),
  );
};

export const consumeLegacyUploadNames = (): string[] => {
  if (!storageAvailable()) return [] as string[];
  try {
    const sessions = JSON.parse(
      window.sessionStorage.getItem(LEGACY_SESSIONS_KEY) ?? "[]",
    ) as Array<{ name?: unknown }>;
    window.sessionStorage.removeItem(LEGACY_SESSIONS_KEY);
    return sessions
      .map((session) => session.name)
      .filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
};
