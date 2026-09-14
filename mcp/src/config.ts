import type { HttpRuntimeConfig, StdioRuntimeConfig } from "./types.js";

const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

const readList = (value: string | undefined): string[] =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0) ?? [];

export const normalizeApiUrl = (value: string): string => {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("NUBBI_API_URL must use http:// or https://");
  }
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
};

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? "3100");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("MCP_PORT must be an integer between 1 and 65535");
  }
  return port;
};

export const readStdioConfig = (
  env: NodeJS.ProcessEnv = process.env,
): StdioRuntimeConfig => {
  const apiKey = env.NUBBI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NUBBI_API_KEY is required for stdio transport");
  }
  if (!apiKey.startsWith("nb_")) {
    throw new Error("NUBBI_API_KEY must be a Nubbi token beginning with nb_");
  }
  return {
    apiUrl: normalizeApiUrl(env.NUBBI_API_URL ?? DEFAULT_API_URL),
    apiKey,
  };
};

export const readHttpConfig = (
  env: NodeJS.ProcessEnv = process.env,
): HttpRuntimeConfig => {
  const allowedHosts = readList(env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = readList(env.MCP_ALLOWED_ORIGINS);
  if (allowedOrigins.includes("*")) {
    throw new Error("MCP_ALLOWED_ORIGINS must list exact origins, not '*'");
  }
  return {
    apiUrl: normalizeApiUrl(env.NUBBI_API_URL ?? DEFAULT_API_URL),
    host: env.MCP_HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.MCP_PORT),
    allowedHosts:
      allowedHosts.length > 0 ? allowedHosts : [...DEFAULT_ALLOWED_HOSTS],
    allowedOrigins,
  };
};
