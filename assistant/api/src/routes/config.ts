import { Router } from "express";
import {
  listCodexModels,
  logoutCodex,
  readCodexAccount,
  startCodexDeviceLogin,
} from "../codex/account.js";
import {
  createMcpServer,
  deleteMcpServer,
  listMcpServers,
  mcpServerSchema,
  updateMcpServer,
} from "../mcp-config.js";
import { testMcpServer } from "../mcp.js";
import {
  listProviderModels,
  modelConfigInputSchema,
  modelConnectionInputSchema,
  publicModelConfig,
  readModelConfig,
  saveModelConfig,
} from "../model-config.js";
import { clearCodexThreadIds } from "../store.js";

export const configRoutes = Router();
const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

configRoutes.get("/mcp/servers", async (_request, response, next) => {
  try {
    response.json(await listMcpServers());
  } catch (error) {
    next(error);
  }
});

configRoutes.post("/mcp/servers", async (request, response) => {
  const parsed = mcpServerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "配置无效" });
    return;
  }
  try {
    const server = await createMcpServer(parsed.data);
    await clearCodexThreadIds();
    response.status(201).json(server);
  } catch (error) {
    const message = messageOf(error, "保存 MCP 配置失败");
    response.status(message.includes("已存在") ? 409 : 400).json({ message });
  }
});

configRoutes.put("/mcp/servers/:id", async (request, response) => {
  const parsed = mcpServerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "配置无效" });
    return;
  }
  try {
    const server = await updateMcpServer(request.params.id, parsed.data);
    await clearCodexThreadIds();
    response.json(server);
  } catch (error) {
    const message = messageOf(error, "更新 MCP 配置失败");
    response.status(message.includes("不存在") ? 404 : 400).json({ message });
  }
});

configRoutes.delete("/mcp/servers/:id", async (request, response, next) => {
  try {
    const deleted = await deleteMcpServer(request.params.id);
    if (deleted) await clearCodexThreadIds();
    response.status(deleted ? 204 : 404).end();
  } catch (error) {
    next(error);
  }
});

configRoutes.post("/mcp/test", async (request, response) => {
  const parsed = mcpServerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "配置无效" });
    return;
  }
  try {
    response.json(await testMcpServer(parsed.data));
  } catch (error) {
    response.status(502).json({ message: messageOf(error, "MCP 连接失败") });
  }
});

configRoutes.get("/model/config", async (_request, response, next) => {
  try {
    response.json(publicModelConfig(await readModelConfig()));
  } catch (error) {
    next(error);
  }
});

configRoutes.put("/model/config", async (request, response) => {
  const parsed = modelConfigInputSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "配置无效" });
    return;
  }
  try {
    const config = await saveModelConfig(parsed.data);
    await clearCodexThreadIds();
    response.json(config);
  } catch (error) {
    response.status(400).json({ message: messageOf(error, "保存模型配置失败") });
  }
});

configRoutes.post("/model/models", async (request, response) => {
  const parsed = modelConnectionInputSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "连接配置无效" });
    return;
  }
  try {
    response.json({ models: await listProviderModels(parsed.data) });
  } catch (error) {
    response.status(502).json({ message: messageOf(error, "获取模型失败") });
  }
});

configRoutes.get("/model/codex/account", async (_request, response) => {
  try {
    response.json(await readCodexAccount());
  } catch (error) {
    response.status(503).json({ message: messageOf(error, "Codex 不可用") });
  }
});

configRoutes.post("/model/codex/login", async (_request, response) => {
  try {
    response.json(await startCodexDeviceLogin());
  } catch (error) {
    response.status(503).json({ message: messageOf(error, "无法开始 ChatGPT 登录") });
  }
});

configRoutes.post("/model/codex/logout", async (_request, response) => {
  try {
    await logoutCodex();
    await clearCodexThreadIds();
    response.status(204).end();
  } catch (error) {
    response.status(503).json({ message: messageOf(error, "退出登录失败") });
  }
});

configRoutes.get("/model/codex/models", async (_request, response) => {
  try {
    response.json({ models: await listCodexModels() });
  } catch (error) {
    response.status(503).json({ message: messageOf(error, "获取 Codex 模型失败") });
  }
});
