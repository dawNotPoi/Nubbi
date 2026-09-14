import { runAgent } from "../orchestration/agent.js";
import type { ProviderExecutor } from "./provider-executor.js";

/** OpenAI 兼容 Provider 执行器：内部复用 runAgent（手写循环编排）。 */
export const openAiExecutor: ProviderExecutor = { execute: runAgent };
