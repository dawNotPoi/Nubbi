type MeetingListSource = {
  password?: unknown;
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};

export const serializeMeetingListItem = (item: unknown) => {
  const source = item as MeetingListSource;
  const plain = typeof source.toObject === "function"
    ? source.toObject()
    : { ...source };
  const { password, ...safeFields } = plain;

  return {
    ...safeFields,
    hasPassword: typeof password === "string" && password.length > 0,
  };
};
