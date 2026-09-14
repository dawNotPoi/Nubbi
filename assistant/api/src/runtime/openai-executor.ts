import { runAgent } from "../orchestration/agent.js";
import type { ProviderExecutor } from "./provider-executor.js";

/** OpenAI 兼容 Provider 执行器：内部复用 LangGraph 的 runAgent。 */
export const openAiExecutor: ProviderExecutor = { execute: runAgent };
