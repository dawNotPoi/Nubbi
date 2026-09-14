import { existsSync } from "node:fs";

import path from "node:path";

import { env, projectRoot } from "../../config/env.ts";

/** Assistant 专属 Codex 凭据和线程数据目录。 */
export const codexHome = path.join(projectRoot, "data", "codex");

/** Codex 子进程的隔离工作目录。 */
export const codexWorkspace = path.join(codexHome, "workspace");

/**
 * 解析 Codex CLI 的可执行入口：
 * 优先使用配置的路径，其次在 Windows 全局 npm 目录探测，最后回退到 PATH 中的 codex。
 * @returns 可执行命令及其参数；配置指向 .js 脚本时用当前 Node 进程运行。
 */
export const resolveCommand = (): { command: string; args: string[] } => {
  const configured = env.CODEX_CLI_PATH;
  if (configured) {
    // 配置指向 .js 脚本时用当前 Node 进程运行。
    return configured.endsWith(".js")
      ? { command: process.execPath, args: [configured] }
      : { command: configured, args: [] };
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    const script = path.join(process.env.APPDATA, "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
    if (existsSync(script)) return { command: process.execPath, args: [script] };
  }
  return { command: "codex", args: [] };
};
