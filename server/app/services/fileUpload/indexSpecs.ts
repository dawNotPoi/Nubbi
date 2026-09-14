export const FILE_UPLOAD_INDEX_KEYS = { ownerId: 1, uploadId: 1 } as const;
export const FILE_UPLOAD_INDEX_OPTIONS = {
  name: "owner_upload_id_unique",
  unique: true,
  partialFilterExpression: { uploadId: { $type: "objectId" } },
} as const;

export const UPLOAD_EXPIRY_INDEX_KEYS = { expiresAt: 1 } as const;
export const UPLOAD_EXPIRY_INDEX_OPTIONS = {
  name: "upload_expiry_scan",
} as const;
