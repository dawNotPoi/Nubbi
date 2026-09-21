import { ObjectId, type Db, type Document } from "mongodb";

const API_KEY_COLLECTION = "apikey";
const USER_COLLECTION = "user";
const DEFAULT_CONFIG_ID = "default";

/** API Key 迁移冲突分类计数。 */
export interface ApiKeyMigrationConflicts {
  emptyOwner: number;
  ownerMismatch: number;
  nonDefaultConfig: number;
  orphanOwner: number;
  invalidCanonicalOwner: number;
}

/** API Key 迁移只读汇总，不包含密钥、用户或文档内容。 */
export interface ApiKeyMigrationSummary {
  total: number;
  pending: number;
  conflicts: number;
  conflictTypes: ApiKeyMigrationConflicts;
}

/** 可供内存验证和数据库执行复用的最小迁移文档。 */
export interface ApiKeyMigrationRecord {
  _id: unknown;
  referenceId?: unknown;
  userId?: unknown;
  configId?: unknown;
}

interface ApiKeyMigrationUpdate {
  ownerId: string;
  filter: Document;
  set: { referenceId?: string; configId?: typeof DEFAULT_CONFIG_ID };
}

/** 纯迁移规划结果。 */
export interface ApiKeyMigrationPlan {
  summary: ApiKeyMigrationSummary;
  updates: readonly ApiKeyMigrationUpdate[];
}

/** 显式 apply 的执行结果。 */
export interface ApiKeyMigrationApplyResult extends ApiKeyMigrationSummary {
  updated: number;
}

/**
 * 将旧归属值转换为稳定字符串；仅旧 userId 允许 BSON ObjectId。
 * @param value 待转换值。
 * @returns 非空字符串，无法识别时返回 null。
 */
const normalizeLegacyOwner = (value: unknown): string | null => {
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (typeof value !== "object" || value === null) return null;
  try {
    const toHexString = (value as { toHexString?: unknown }).toHexString;
    if (typeof toHexString !== "function") return null;
    const result = toHexString.call(value);
    return typeof result === "string" && result.length > 0 ? result : null;
  } catch {
    return null;
  }
};

/**
 * 依据快照生成不修改输入的迁移计划。
 * @param records API Key 文档最小投影。
 * @param existingUserIds 当前存在的用户 ID 字符串集合。
 * @returns 汇总与条件更新计划；冲突存在时仍不包含可供部分执行的承诺。
 */
export const planApiKeyMigration = (
  records: readonly ApiKeyMigrationRecord[],
  existingUserIds: ReadonlySet<string>,
): ApiKeyMigrationPlan => {
  const conflictTypes: ApiKeyMigrationConflicts = {
    emptyOwner: 0,
    ownerMismatch: 0,
    nonDefaultConfig: 0,
    orphanOwner: 0,
    invalidCanonicalOwner: 0,
  };
  const updates: ApiKeyMigrationUpdate[] = [];
  let conflicts = 0;

  for (const record of records) {
    const canonical =
      typeof record.referenceId === "string" && record.referenceId.length > 0
        ? record.referenceId
        : null;
    const legacy = normalizeLegacyOwner(record.userId);
    let conflicted = false;

    if (record.referenceId !== undefined && canonical === null) {
      conflictTypes.invalidCanonicalOwner += 1;
      conflicted = true;
    } else if (!canonical && !legacy) {
      conflictTypes.emptyOwner += 1;
      conflicted = true;
    } else if (canonical && legacy && canonical !== legacy) {
      conflictTypes.ownerMismatch += 1;
      conflicted = true;
    }

    if (record.configId !== undefined && record.configId !== DEFAULT_CONFIG_ID) {
      conflictTypes.nonDefaultConfig += 1;
      conflicted = true;
    }

    const owner = canonical ?? legacy;
    if (owner && !existingUserIds.has(owner)) {
      conflictTypes.orphanOwner += 1;
      conflicted = true;
    }
    if (conflicted || !owner) {
      conflicts += 1;
      continue;
    }

    const set: ApiKeyMigrationUpdate["set"] = {};
    const filter: Document = {
      _id: record._id,
      referenceId:
        record.referenceId === undefined
          ? { $exists: false }
          : record.referenceId,
      userId:
        record.userId === undefined ? { $exists: false } : record.userId,
      configId:
        record.configId === undefined ? { $exists: false } : record.configId,
    };
    if (record.referenceId === undefined) {
      set.referenceId = owner;
    }
    if (record.configId === undefined) {
      set.configId = DEFAULT_CONFIG_ID;
    }
    if (Object.keys(set).length > 0) {
      updates.push({ ownerId: owner, filter, set });
    }
  }

  return {
    summary: {
      total: records.length,
      pending: updates.length,
      conflicts,
      conflictTypes,
    },
    updates,
  };
};

/**
 * 只读检查 API Key 迁移状态。
 * @param db MongoDB 数据库实例。
 * @returns 不含敏感信息的数量汇总。
 */
export const inspectApiKeyMigration = async (
  db: Db,
): Promise<ApiKeyMigrationSummary> => (await buildDatabasePlan(db)).summary;

/**
 * 显式执行迁移；任一冲突或条件更新竞争失败都会停止。
 * @param db MongoDB 数据库实例。
 * @returns 执行后的安全计数。
 */
export const applyApiKeyMigration = async (
  db: Db,
): Promise<ApiKeyMigrationApplyResult> => {
  const plan = await buildDatabasePlan(db);
  if (plan.summary.conflicts > 0) {
    throw new Error("API Key 迁移存在冲突，未写入任何数据");
  }

  let updated = 0;
  for (const item of plan.updates) {
    if (!(await userExists(db, item.ownerId))) {
      throw new Error(
        `API Key 迁移检测到用户已被删除，已停止；此前已更新 ${updated} 条`,
      );
    }
    const result = await db
      .collection<Document>(API_KEY_COLLECTION)
      .updateOne(item.filter, { $set: item.set });
    if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
      throw new Error(`API Key 迁移检测到并发变化，已停止；此前已更新 ${updated} 条`);
    }
    updated += 1;
  }
  const finalSummary = await inspectApiKeyMigration(db);
  if (finalSummary.pending > 0 || finalSummary.conflicts > 0) {
    throw new Error(
      `API Key 迁移后复核失败（待迁移 ${finalSummary.pending}，冲突 ${finalSummary.conflicts}）；此前已更新 ${updated} 条`,
    );
  }
  return { ...finalSummary, updated };
};

/**
 * 在每次条件写入前重新确认归属用户仍存在。
 * @param db MongoDB 数据库实例。
 * @param ownerId 规范化后的用户 ID。
 * @returns 用户是否仍存在。
 */
const userExists = async (db: Db, ownerId: string): Promise<boolean> => {
  const candidates: Array<ObjectId | string> = [ownerId];
  if (ObjectId.isValid(ownerId)) candidates.push(new ObjectId(ownerId));
  const user = await db
    .collection<{ _id: ObjectId | string }>(USER_COLLECTION)
    .findOne({ _id: { $in: candidates } }, { projection: { _id: 1 } });
  return user !== null;
};

/**
 * 从数据库最小投影构造迁移计划。
 * @param db MongoDB 数据库实例。
 * @returns 纯规划结果。
 */
const buildDatabasePlan = async (db: Db): Promise<ApiKeyMigrationPlan> => {
  const [records, users] = await Promise.all([
    db
      .collection<ApiKeyMigrationRecord>(API_KEY_COLLECTION)
      .find({}, {
        projection: { _id: 1, referenceId: 1, userId: 1, configId: 1 },
      })
      .toArray(),
    db
      .collection<{ _id: ObjectId | string }>(USER_COLLECTION)
      .find({}, { projection: { _id: 1 } })
      .toArray(),
  ]);
  const userIds = new Set(
    users
      .map((user) => normalizeLegacyOwner(user._id))
      .filter((id): id is string => id !== null),
  );
  return planApiKeyMigration(records, userIds);
};
