import { MongoClient } from "mongodb";
import {
  applyAuthIndexes,
  inspectAuthIndexes,
} from "../../app/services/auth/auth-indexes";

interface CliOptions {
  apply: boolean;
  databaseName: string;
}

/** 执行认证索引只读检查或显式创建。 */
const main = async (): Promise<void> => {
  const options = parseArguments(process.argv.slice(2));
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("必须通过环境变量 MONGO_URI 提供连接地址");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(options.databaseName);
    const result = options.apply
      ? await applyAuthIndexes(db)
      : await inspectAuthIndexes(db);
    process.stdout.write(
      `${JSON.stringify({ mode: options.apply ? "apply" : "dry-run", database: options.databaseName, ...result }, null, 2)}\n`,
    );
    if (
      !options.apply &&
      (result.missing > 0 ||
        result.conflicting > 0 ||
        result.duplicateRisk > 0)
    ) {
      process.exitCode = 2;
    }
  } finally {
    await client.close();
  }
};

/**
 * 严格解析索引维护参数。
 * @param args 不含 node 和脚本路径的参数列表。
 * @returns 已验证的运行选项。
 */
const parseArguments = (args: readonly string[]): CliOptions => {
  const valueFlags = new Set(["--database", "--confirm-database"]);
  const booleanFlags = new Set(["--apply", "--backup-complete"]);
  const seen = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!valueFlags.has(token) && !booleanFlags.has(token)) {
      throw new Error(`参数错误：未知参数 ${token}`);
    }
    if (seen.has(token)) throw new Error(`参数错误：参数 ${token} 重复`);
    seen.add(token);
    if (!valueFlags.has(token)) continue;

    const value = args[index + 1];
    if (!value || value.startsWith("-") || value.trim() !== value) {
      throw new Error(`参数错误：${token} 缺少合法值`);
    }
    values.set(token, value);
    index += 1;
  }

  const databaseName = values.get("--database");
  if (!databaseName) {
    throw new Error("参数错误：必须通过 --database 明确指定数据库名称");
  }
  const apply = seen.has("--apply");
  const backupConfirmed = seen.has("--backup-complete");
  const confirmedDatabase = values.get("--confirm-database");
  if (apply && (confirmedDatabase !== databaseName || !backupConfirmed)) {
    throw new Error(
      "参数错误：apply 需要 --confirm-database 与数据库名完全一致，并显式提供 --backup-complete",
    );
  }
  if (!apply && (confirmedDatabase !== undefined || backupConfirmed)) {
    throw new Error("参数错误：确认参数只能与 --apply 一起使用");
  }
  return { apply, databaseName };
};

void main().catch((error: unknown) => {
  const message =
    error instanceof Error &&
    (error.message.startsWith("认证索引") ||
      error.message.startsWith("参数错误：") ||
      error.message.startsWith("必须通过环境变量"))
      ? error.message
      : "数据库连接或索引维护失败（连接地址已隐藏）";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
