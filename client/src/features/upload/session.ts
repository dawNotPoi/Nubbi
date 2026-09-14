import type { UploadSession } from "./model";

const SESSIONS_KEY = "nubbi_upload_sessions_v2";
const LEGACY_SESSIONS_KEY = "nubbi_upload_sessions";

const storageAvailable = () => typeof window !== "undefined";

export const getUploadSessions = (): UploadSession[] => {
  if (!storageAvailable()) return [];
  try {
    const sessions = JSON.parse(
      window.localStorage.getItem(SESSIONS_KEY) ?? "[]",
    ) as UploadSession[];
    return sessions.filter(
      (session) => session.uploadId && session.name && session.size > 0,
    );
  } catch {
    return [];
  }
};

const writeSessions = (sessions: UploadSession[]) => {
  if (!storageAvailable()) return;
  if (sessions.length === 0) {
    window.localStorage.removeItem(SESSIONS_KEY);
    return;
  }
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const saveUploadSession = (session: UploadSession) => {
  const sessions = getUploadSessions().filter(
    (item) => item.uploadId !== session.uploadId,
  );
  writeSessions([...sessions, session]);
};

export const removeUploadSession = (uploadId: string) => {
  writeSessions(
    getUploadSessions().filter((session) => session.uploadId !== uploadId),
  );
};

export const removeUploadSessionsByFingerprint = (hash: string, size: number) => {
  writeSessions(
    getUploadSessions().filter(
      (session) => session.hash !== hash || session.size !== size,
    ),
  );
};

export const consumeLegacyUploadNames = () => {
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
