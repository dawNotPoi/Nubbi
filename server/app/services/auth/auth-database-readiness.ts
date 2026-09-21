import type { BetterAuthOptions } from "better-auth";
import { getSchema } from "better-auth/db";
import type { Db } from "mongodb";
import { inspectApiKeyMigration } from "./api-key-migration";
import {
  inspectAuthIndexes,
  isAuthIndexSemanticallyEquivalent,
  type AuthIndexInspection,
} from "./auth-indexes";

/** 认证数据库只读门禁结果。 */
export interface AuthDatabaseReadiness {
  apiKeys: Awaited<ReturnType<typeof inspectApiKeyMigration>>;
  requiredIndexes: number;
  indexes: AuthIndexInspection;
}

/**
 * 检查迁移状态及 Better Auth 明确声明的表级索引，不创建或修改索引。
 * @param db MongoDB 数据库实例。
 * @param options 实际 Better Auth 配置中与 Schema 有关的选项。
 * @returns readiness 安全汇总。
 */
export const assertAuthDatabaseReady = async (
  db: Db,
  options: BetterAuthOptions,
): Promise<AuthDatabaseReadiness> => {
  const apiKeys = await inspectApiKeyMigration(db);
  if (apiKeys.pending > 0 || apiKeys.conflicts > 0) {
    throw new Error(
      `API Key 数据尚未就绪（待迁移 ${apiKeys.pending}，冲突 ${apiKeys.conflicts}）。请先运行 pnpm auth:migrate-api-keys`,
    );
  }

  const schema = getSchema(options);
  let requiredIndexes = 0;
  const collections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      ({ name }) => name,
    ),
  );
  for (const [collectionName, table] of Object.entries(schema)) {
    const expected = table.indexes ?? [];
    requiredIndexes += expected.length;
    if (expected.length === 0) continue;
    if (!collections.has(collectionName)) {
      throw new Error(`认证集合 ${collectionName} 缺少官方声明索引`);
    }
    const actual = await db.collection(collectionName).listIndexes().toArray();
    for (const index of expected) {
      if (
        !actual.some((candidate) =>
          isAuthIndexSemanticallyEquivalent(candidate, {
            key: Object.fromEntries(index.columns.map((field) => [field, 1])),
            unique: index.unique,
          }),
        )
      ) {
        throw new Error(
          `认证集合 ${collectionName} 的官方声明索引缺失或冲突：${index.name}`,
        );
      }
    }
  }
  const indexes = await inspectAuthIndexes(db);
  if (
    indexes.missing > 0 ||
    indexes.conflicting > 0 ||
    indexes.duplicateRisk > 0
  ) {
    throw new Error(
      `认证索引尚未就绪（缺失 ${indexes.missing}，冲突 ${indexes.conflicting}，重复风险 ${indexes.duplicateRisk}）。请先运行 pnpm auth:manage-indexes -- --database <数据库名>`,
    );
  }
  return {
    apiKeys,
    requiredIndexes: requiredIndexes + indexes.required,
    indexes,
  };
};
