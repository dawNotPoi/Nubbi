import crypto from "crypto";
import env from "./env";

const ALGORITHM = "aes-256-gcm";

const getSecret = () => env.AI_CONFIG_SECRET || env.BETTER_AUTH_SECRET;

const getKey = () =>
  crypto.createHash("sha256").update(getSecret()).digest();

export const encryptSecret = (value: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((item) => item.toString("base64"))
    .join(".");
};

export const decryptSecret = (value: string) => {
  const [ivBase64, authTagBase64, encryptedBase64] = value.split(".");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted secret format");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};
