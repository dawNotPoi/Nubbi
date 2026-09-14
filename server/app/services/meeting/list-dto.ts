type MeetingListSource = {
  password?: unknown;
  passwordHash?: unknown;
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};

export type MeetingListItem = Record<string, unknown> & {
  hasPassword: boolean;
};

export const serializeMeetingListItem = (item: unknown): MeetingListItem => {
  const source = item as MeetingListSource;
  const plain =
    typeof source.toObject === "function" ? source.toObject() : { ...source };
  const { password, passwordHash, ...safeFields } = plain;

  return {
    ...safeFields,
    hasPassword:
      (typeof passwordHash === "string" && passwordHash.length > 0) ||
      (typeof password === "string" && password.length > 0),
  };
};
