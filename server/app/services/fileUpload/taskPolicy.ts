/** 判断上传任务是否已过期 */
export const isUploadTaskExpired = (
  expiresAt: Date,
  cutoff: Date,
): boolean => expiresAt <= cutoff;

/** 活跃上传任务的查询守卫：未清理且未过期 */
export const getActiveUploadTaskGuard = (
  cutoff: Date,
): {
  cleanupToken: null;
  expiresAt: { $gt: Date };
} => ({
  cleanupToken: null,
  expiresAt: { $gt: cutoff },
});
