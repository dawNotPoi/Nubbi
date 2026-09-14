export type KeyValuePair = { key: string; value: string };

export const recordToPairs = (
  record: Record<string, string>,
): KeyValuePair[] => Object.entries(record).map(([key, value]) => ({ key, value }));

export const pairsToRecord = (
  pairs: KeyValuePair[],
): Record<string, string> => Object.fromEntries(
  pairs
    .map((pair) => ({ key: pair.key.trim(), value: pair.value }))
    .filter((pair) => pair.key.length > 0)
    .map((pair) => [pair.key, pair.value]),
);
