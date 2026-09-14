import { runAgent } from "../agent.js";
import type { ProviderExecutor } from "./provider-executor.js";

export const openAiExecutor: ProviderExecutor = { execute: runAgent };
