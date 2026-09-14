import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const testRoot = path.join(root, "test");

const collectTests = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error && error.code === "ENOENT") return [];
    throw error;
  });

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTests(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
};

const tests = await collectTests(testRoot);

if (tests.length === 0) {
  console.log("[mcp:test] no *.test.ts files found; skipping");
  process.exit(0);
}

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const child = spawn(process.execPath, [tsxCli, "--test", ...tests], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
