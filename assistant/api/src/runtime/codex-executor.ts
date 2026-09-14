import { runCodex } from "../codex/runner.js";
import type { ProviderExecutor } from "./provider-executor.js";

/** Codex 订阅 Provider 执行器：内部复用 Codex App Server 的 runCodex。 */
export const codexExecutor: ProviderExecutor = { execute: runCodex };
