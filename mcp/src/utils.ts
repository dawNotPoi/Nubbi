import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const isDirectRun = (metaUrl: string): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && pathToFileURL(resolve(entry)).href === metaUrl;
};

export const reportFatalError = (label: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${label}: ${message}\n`);
  process.exitCode = 1;
};
