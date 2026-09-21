import type {
  CollationOptions,
  Db,
  Document,
  Filter,
  IndexDescriptionInfo,
} from "mongodb";

interface RequiredAuthIndex {
  collection: string;
  name: string;
  key: Readonly<Record<string, 1 | -1>>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: Filter<Document>;
  collation?: CollationOptions;
}

/** 可比较的 MongoDB 索引语义；名称不属于等价条件。 */
export interface AuthIndexSemantics {
  key: Readonly<Record<string, unknown>>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: object;
  collation?: object;
}

const REQUIRED_AUTH_INDEXES: readonly RequiredAuthIndex[] = [
  { collection: "user", name: "auth_user_email_unique", key: { email: 1 }, unique: true },
  { collection: "session", name: "auth_session_token_unique", key: { token: 1 }, unique: true },
  { collection: "session", name: "auth_session_user_id", key: { userId: 1 } },
  { collection: "session", name: "auth_session_expires_at", key: { expiresAt: 1 } },
  { collection: "account", name: "auth_account_user_id", key: { userId: 1 } },
  { collection: "account", name: "auth_account_provider_account", key: { providerId: 1, accountId: 1 } },
  { collection: "verification", name: "auth_verification_identifier", key: { identifier: 1 } },
  { collection: "verification", name: "auth_verification_expires_at", key: { expiresAt: 1 } },
  { collection: "apikey", name: "auth_apikey_config_id", key: { configId: 1 } },
  { collection: "apikey", name: "auth_apikey_reference_id", key: { referenceId: 1 } },
  { collection: "apikey", name: "auth_apikey_key", key: { key: 1 } },
  { collection: "jwks", name: "auth_jwks_created_at", key: { createdAt: 1 } },
];

/** 认证索引只读检查汇总，不包含业务数据。 */
export interface AuthIndexInspection {
  required: number;
  missing: number;
  conflicting: number;
  duplicateRisk: number;
}

/** 认证索引显式创建结果。 */
export interface AuthIndexApplyResult extends AuthIndexInspection {
  created: number;
}

/**
 * 只读检查必需认证索引、语义冲突和唯一索引重复风险。
 * @param db MongoDB 数据库实例。
 * @returns 仅包含计数的安全汇总。
 */
export const inspectAuthIndexes = async (db: Db): Promise<AuthIndexInspection> =>
  (await buildIndexPlan(db)).summary;

/**
 * 在全量预检通过后创建缺失索引，不删除或重建现有索引。
 * @param db MongoDB 数据库实例。
 * @returns 创建数量和最终只读汇总。
 */
export const applyAuthIndexes = async (db: Db): Promise<AuthIndexApplyResult> => {
  const plan = await buildIndexPlan(db);
  if (plan.summary.conflicting > 0 || plan.summary.duplicateRisk > 0) {
    throw new Error(
      `认证索引存在冲突或重复风险（冲突 ${plan.summary.conflicting}，重复风险 ${plan.summary.duplicateRisk}），未写入任何索引`,
    );
  }

  let created = 0;
  for (const required of plan.missing) {
    const options = {
      name: required.name,
      unique: required.unique ?? false,
      ...(required.sparse === undefined ? {} : { sparse: required.sparse }),
      ...(required.partialFilterExpression === undefined
        ? {}
        : { partialFilterExpression: required.partialFilterExpression }),
      ...(required.collation === undefined
        ? {}
        : { collation: required.collation }),
    };
    await db
      .collection(required.collection)
      .createIndex(required.key, options);
    created += 1;
  }

  const finalSummary = await inspectAuthIndexes(db);
  if (finalSummary.missing > 0 || finalSummary.conflicting > 0) {
    throw new Error(
      `认证索引创建后复核失败（缺失 ${finalSummary.missing}，冲突 ${finalSummary.conflicting}）；此前已创建 ${created} 个`,
    );
  }
  return { ...finalSummary, created };
};

interface AuthIndexPlan {
  summary: AuthIndexInspection;
  missing: readonly RequiredAuthIndex[];
}

/** 构造只读索引计划，并在写入前完成全部唯一性风险检查。 */
const buildIndexPlan = async (db: Db): Promise<AuthIndexPlan> => {
  const collectionNames = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
  const indexesByCollection = new Map<string, readonly IndexDescriptionInfo[]>();
  const missing: RequiredAuthIndex[] = [];
  let conflicting = 0;
  let duplicateRisk = 0;

  for (const required of REQUIRED_AUTH_INDEXES) {
    let actual = indexesByCollection.get(required.collection);
    if (!actual) {
      actual = collectionNames.has(required.collection)
        ? await db.collection(required.collection).listIndexes().toArray()
        : [];
      indexesByCollection.set(required.collection, actual);
    }

    if (actual.some((index) => indexesEquivalent(index, required))) continue;
    if (required.unique && collectionNames.has(required.collection)) {
      duplicateRisk += await hasDuplicateValues(db, required);
    }
    const conflict = actual.some(
      (index) =>
        index.name === required.name || keysEqual(index.key, required.key),
    );
    if (conflict) {
      conflicting += 1;
      continue;
    }

    missing.push(required);
  }

  return {
    summary: {
      required: REQUIRED_AUTH_INDEXES.length,
      missing: missing.length,
      conflicting,
      duplicateRisk,
    },
    missing,
  };
};

/** 检查一个待建唯一索引是否已有重复键组合。 */
const hasDuplicateValues = async (
  db: Db,
  required: RequiredAuthIndex,
): Promise<0 | 1> => {
  const groupId = Object.fromEntries(
    Object.keys(required.key).map((field) => [field, `$${field}`]),
  );
  const duplicate = await db
    .collection(required.collection)
    .aggregate([{ $group: { _id: groupId, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 1 }])
    .hasNext();
  return duplicate ? 1 : 0;
};

/** 判断现有索引是否与需求语义等价，名称不同也可复用。 */
const indexesEquivalent = (
  actual: IndexDescriptionInfo,
  required: RequiredAuthIndex,
): boolean => isAuthIndexSemanticallyEquivalent(actual, required);

/**
 * 比较索引键顺序与影响行为的选项，允许名称不同并忽略对象属性顺序。
 * @param actual 数据库中的现有索引。
 * @param expected 期望的索引语义。
 * @returns 两者语义完全一致时为 true。
 */
export const isAuthIndexSemanticallyEquivalent = (
  actual: AuthIndexSemantics,
  expected: AuthIndexSemantics,
): boolean =>
  keysEqual(actual.key, expected.key) &&
  Boolean(actual.unique) === Boolean(expected.unique) &&
  Boolean(actual.sparse) === Boolean(expected.sparse) &&
  semanticEqual(
    actual.partialFilterExpression ?? null,
    expected.partialFilterExpression ?? null,
  ) &&
  semanticEqual(actual.collation ?? null, expected.collation ?? null);

/** 按字段顺序和值比较索引键。 */
const keysEqual = (
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): boolean =>
  semanticEqual(Object.entries(actual), Object.entries(expected));

/** 对对象键顺序不敏感地比较影响索引语义的嵌套值。 */
const semanticEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));

/** 将对象递归转为稳定键序，数组顺序保持不变。 */
const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeValue(child)]),
  );
};
