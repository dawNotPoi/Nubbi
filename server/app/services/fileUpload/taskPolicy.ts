export const isUploadTaskExpired = (
  expiresAt: Date,
  cutoff: Date,
) => expiresAt <= cutoff;

export const getActiveUploadTaskGuard = (cutoff: Date) => ({
  cleanupToken: null,
  expiresAt: { $gt: cutoff },
});
