import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

export const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

dotenv.config({ path: path.join(projectRoot, ".env") });

const readServerMongoUri = (): string | undefined => {
  try {
    const values = dotenv.parse(readFileSync(path.join(projectRoot, "..", "server", ".env")));
    return values.MONGO_URI;
  } catch {
    return undefined;
  }
};

const optionalString = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const requiredString = (name: string) => z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string({ required_error: `Missing required env var: ${name}` }).min(1),
);

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  MONGO_URI: requiredString("MONGO_URI"),
  ASSISTANT_MONGO_DB_NAME: optionalString().default("NubbiAssistant"),
  CONFIG_ADMIN_TOKEN: optionalString(),
  MCP_CONFIG_TOKEN: optionalString(),
  CODEX_CLI_PATH: optionalString(),
});

export const env = schema.parse({
  ...process.env,
  MONGO_URI: process.env.MONGO_URI ?? readServerMongoUri(),
});
