import { runCodex } from "../codex/runner.js";
import type { ProviderExecutor } from "./provider-executor.js";

export const codexExecutor: ProviderExecutor = { execute: runCodex };
