import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/** 会议密码哈希算法 */
const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

/** 使用 scrypt 哈希会议密码，返回 [prefix$salt$key] 格式 */
export const hashMeetingPassword = async (
  password: string,
): Promise<string> => {
  if (!password) return "";
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return [
    HASH_PREFIX,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
};

/** 校验会议密码：解析哈希结构并用 timingSafeEqual 比较 */
export const verifyMeetingPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const [prefix, saltHex, keyHex] = encodedHash.split("$");
  if (prefix !== HASH_PREFIX || !saltHex || !keyHex) return false;

  try {
    const expectedKey = Buffer.from(keyHex, "hex");
    if (expectedKey.length !== KEY_LENGTH) return false;
    const actualKey = (await scrypt(
      password,
      Buffer.from(saltHex, "hex"),
      KEY_LENGTH,
    )) as Buffer;
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
};

/** 校验旧版会议密码（明文存储的兼容逻辑） */
export const verifyLegacyMeetingPassword = (
  password: string,
  expectedPassword: string,
): boolean => {
  const actual = Buffer.from(password);
  const expected = Buffer.from(expectedPassword);
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
};
