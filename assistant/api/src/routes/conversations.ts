import { Router, type Response } from "express";
import { z } from "zod";
import { runAgent } from "../agent.js";
import { cancelThreadApprovals } from "../approvals.js";
import { runCodex } from "../codex/runner.js";
import { asyncRoute } from "../middleware/async-route.js";
import { readModelConfig } from "../model-config.js";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  modelHistory,
} from "../store.js";

export const conversationRoutes = Router();
let activeGeneration: { controller: AbortController; approvalThreadId: string } | null = null;

const sendEvent = (response: Response, event: string, data: unknown): void => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

conversationRoutes.get("/conversations", asyncRoute(async (_request, response) => {
  response.json(await listConversations());
}));

conversationRoutes.post("/conversations", asyncRoute(async (_request, response) => {
  response.status(201).json(await createConversation());
}));

conversationRoutes.get("/conversations/:id", asyncRoute(async (request, response) => {
  const conversation = await getConversation(z.string().parse(request.params.id));
  if (!conversation) {
    response.status(404).json({ message: "对话不存在" });
    return;
  }
  response.json(conversation);
}));

conversationRoutes.delete("/conversations/:id", asyncRoute(async (request, response) => {
  const deleted = await deleteConversation(z.string().parse(request.params.id));
  response.status(deleted ? 204 : 404).end();
}));

conversationRoutes.post("/generations/stop", (_request, response) => {
  if (activeGeneration) {
    activeGeneration.controller.abort();
    cancelThreadApprovals(activeGeneration.approvalThreadId);
  }
  response.status(204).end();
});

conversationRoutes.post("/conversations/:id/messages", asyncRoute(async (request, response) => {
  if (activeGeneration) {
    response.status(409).json({ message: "当前已有任务正在生成" });
    return;
  }
  const parsed = z.object({ content: z.string().trim().min(1).max(20_000) })
    .safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "消息内容无效" });
    return;
  }
  const conversationId = z.string().parse(request.params.id);
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    response.status(404).json({ message: "对话不存在" });
    return;
  }

  await appendMessage(conversationId, "user", [{ type: "text", text: parsed.data.content }]);
  const modelConfig = await readModelConfig();
  const controller = new AbortController();
  const approvalThreadId = modelConfig.provider === "codex-subscription"
    ? conversation.codexThreadId ?? conversationId
    : conversationId;
  activeGeneration = { controller, approvalThreadId };
  response.on("close", () => {
    if (!response.writableEnded) controller.abort();
  });
  response.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  response.flushHeaders();
  sendEvent(response, "message-start", { conversationId });

  try {
    const emit = (event: Parameters<typeof sendEvent>[2] & { type?: string }) => {
      if (event && typeof event === "object" && "type" in event && typeof event.type === "string") {
        sendEvent(response, event.type, event);
      }
    };
    const parts = modelConfig.provider === "codex-subscription"
      ? await runCodex({
          conversationId,
          content: parsed.data.content,
          codexThreadId: conversation.codexThreadId,
          modelConfig,
          signal: controller.signal,
          emit,
        })
      : await runAgent({
          conversationId,
          history: await modelHistory(conversationId),
          signal: controller.signal,
          emit,
        });
    const message = await appendMessage(conversationId, "assistant", parts);
    sendEvent(response, "done", { message });
  } catch (error) {
    const message = controller.signal.aborted
      ? "生成已停止"
      : error instanceof Error ? error.message : "助手运行失败";
    const saved = await appendMessage(conversationId, "assistant", [{ type: "error", message }]);
    sendEvent(response, "error", { message });
    sendEvent(response, "done", { message: saved });
  } finally {
    cancelThreadApprovals(approvalThreadId);
    activeGeneration = null;
    response.end();
  }
}));
