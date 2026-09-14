export const isUploadTaskExpired = (
  expiresAt: Date,
  cutoff: Date,
): boolean => expiresAt <= cutoff;

export const getActiveUploadTaskGuard = (
  cutoff: Date,
): {
  cleanupToken: null;
  expiresAt: { $gt: Date };
} => ({
  cleanupToken: null,
  expiresAt: { $gt: cutoff },
});
