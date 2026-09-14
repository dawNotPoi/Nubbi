import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

export const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

dotenv.config({ path: path.join(projectRoot, ".env") });

const optionalString = () =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  CONFIG_ADMIN_TOKEN: optionalString(),
  MCP_CONFIG_TOKEN: optionalString(),
  CODEX_CLI_PATH: optionalString(),
});

export const env = schema.parse(process.env);
