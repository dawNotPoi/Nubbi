import { getUser } from "@/lib/auth";
import { findRelevantNotes } from "@/lib/noteAiKnowledge";
import {
  listProviderModels,
  NoteAiChatMessage,
  NoteAiProvider,
  streamProviderResponse,
} from "@/lib/noteAiProviders";
import { decryptSecret, encryptSecret } from "@/lib/noteAiCrypto";
import AiConfig from "@/models/aiConfig";
import NoteAiMessage from "@/models/noteAiMessage";
import NoteAiSession from "@/models/noteAiSession";
import requireAuth from "@/middleware/session";
import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../middleware/common";
import { validate, validateParams } from "../middleware/validator";
import { successResponse } from "./utils";

const router = express.Router();

const providerSchema = z.enum([
  "openai",
  "openai-compatible",
  "anthropic",
  "gemini",
]);

const configBodySchema = z.object({
  provider: providerSchema,
  baseURL: z.string().optional().default(""),
  model: z.string().optional().default(""),
  apiKey: z.string().optional(),
  enableWeb: z.boolean().optional().default(false),
  enableKnowledgeBase: z.boolean().optional().default(true),
});

const modelsBodySchema = z.object({
  provider: providerSchema,
  baseURL: z.string().optional().default(""),
  apiKey: z.string().optional(),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.string().min(1),
});

const chatBodySchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().trim().min(1),
  enableWeb: z.boolean().optional(),
  enableKnowledgeBase: z.boolean().optional(),
});

const serializeConfig = (config: any) => ({
  provider: config?.provider || "openai-compatible",
  baseURL: config?.baseURL || "",
  model: config?.model || "",
  enableWeb: Boolean(config?.enableWeb),
  enableKnowledgeBase:
    config?.enableKnowledgeBase === undefined
      ? true
      : Boolean(config.enableKnowledgeBase),
  hasApiKey: Boolean(config?.apiKeyEncrypted),
});

const getOwnedSession = async (userId: string, sessionId: string) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw Object.assign(new Error("Invalid session id"), { status: 400 });
  }

  const session = await NoteAiSession.findOne({ _id: sessionId, userId });
  if (!session) {
    throw Object.assign(new Error("Session not found"), { status: 404 });
  }

  return session;
};

const sendSse = (res: express.Response, event: string, data: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const toPlainMessage = (message: any) => ({
  _id: String(message._id),
  sessionId: String(message.sessionId),
  userId: message.userId,
  role: message.role,
  content: message.content,
  sources: Array.isArray(message.sources) ? message.sources : [],
  status: message.status,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const buildSessionTitle = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) return "New Chat";
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
};

const buildMessagesForModel = ({
  history,
  knowledgeContext,
  webRequested,
}: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  knowledgeContext: string;
  webRequested: boolean;
}): NoteAiChatMessage[] => {
  const systemSections = [
    "You are Note AI inside D-NOTE. Answer clearly and helpfully.",
    "When note context is provided, prefer grounding your answer in that context and say when information is based on user notes.",
    webRequested
      ? "The user enabled web access, but this version does not have real external search. Explicitly say that online search is not available yet if needed."
      : "Do not mention web search unless the user asks.",
  ];

  if (knowledgeContext) {
    systemSections.push(`Relevant note context:\n${knowledgeContext}`);
  }

  return [
    {
      role: "system",
      content: systemSections.join("\n\n"),
    },
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ];
};

router.get(
  "/config",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const config = await AiConfig.findOne({ userId: id }).lean();
    successResponse(res, serializeConfig(config));
  }),
);

router.put(
  "/config",
  requireAuth,
  validate(configBodySchema),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const { provider, baseURL, model, apiKey, enableWeb, enableKnowledgeBase } =
      configBodySchema.parse(req.body);

    const currentConfig = await AiConfig.findOne({ userId: id });
    const nextConfig = currentConfig || new AiConfig({ userId: id });

    nextConfig.set({
      provider,
      baseURL,
      model,
      enableWeb,
      enableKnowledgeBase,
    });

    if (apiKey !== undefined) {
      nextConfig.apiKeyEncrypted = apiKey.trim()
        ? encryptSecret(apiKey.trim())
        : "";
    }

    await nextConfig.save();

    successResponse(res, serializeConfig(nextConfig), "AI config saved");
  }),
);

router.post(
  "/models",
  requireAuth,
  validate(modelsBodySchema),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const { provider, baseURL, apiKey } = modelsBodySchema.parse(req.body);
    const config = await AiConfig.findOne({ userId: id }).lean();
    const resolvedApiKey = apiKey?.trim()
      ? apiKey.trim()
      : config?.apiKeyEncrypted
        ? decryptSecret(config.apiKeyEncrypted)
        : "";

    if (!resolvedApiKey) {
      throw Object.assign(new Error("AI API key is required"), { status: 400 });
    }

    const models = await listProviderModels({
      provider,
      baseURL,
      apiKey: resolvedApiKey,
    });

    successResponse(res, models);
  }),
);

router.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const sessions = await NoteAiSession.find({ userId: id })
      .sort({ updatedAt: -1 })
      .lean();

    successResponse(
      res,
      sessions.map((session) => ({
        _id: String(session._id),
        userId: session.userId,
        title: session.title,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    );
  }),
);

router.post(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const session = await NoteAiSession.create({
      userId: id,
      title: "New Chat",
      lastMessageAt: new Date(),
    });

    successResponse(res, {
      _id: String(session._id),
      userId: session.userId,
      title: session.title,
      lastMessageAt: session.lastMessageAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }),
);

router.delete(
  "/sessions/:sessionId",
  requireAuth,
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const { sessionId } = sessionIdParamsSchema.parse(req.params);
    const session = await getOwnedSession(id, sessionId);

    await NoteAiMessage.deleteMany({ sessionId: session._id, userId: id });
    await NoteAiSession.deleteOne({ _id: session._id, userId: id });

    successResponse(res, null, "Session deleted");
  }),
);

router.get(
  "/sessions/:sessionId/messages",
  requireAuth,
  validateParams(sessionIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const { sessionId } = sessionIdParamsSchema.parse(req.params);
    const session = await getOwnedSession(id, sessionId);

    const messages = await NoteAiMessage.find({
      sessionId: session._id,
      userId: id,
    })
      .sort({ createdAt: 1 })
      .lean();

    successResponse(res, messages.map(toPlainMessage));
  }),
);

router.post(
  "/chat/stream",
  requireAuth,
  validate(chatBodySchema),
  async (req, res, next) => {
    try {
      const { id } = await getUser(req);
      const { sessionId, message, enableKnowledgeBase, enableWeb } =
        chatBodySchema.parse(req.body);

      const config = await AiConfig.findOne({ userId: id });
      if (!config) {
        throw Object.assign(new Error("AI config not found"), { status: 400 });
      }
      if (!config.model.trim()) {
        throw Object.assign(new Error("AI model is required"), { status: 400 });
      }
      if (!config.apiKeyEncrypted) {
        throw Object.assign(new Error("AI API key is required"), {
          status: 400,
        });
      }

      const provider = config.provider as NoteAiProvider;
      const apiKey = decryptSecret(config.apiKeyEncrypted);
      const session =
        sessionId && sessionId.trim()
          ? await getOwnedSession(id, sessionId)
          : await NoteAiSession.create({
              userId: id,
              title: buildSessionTitle(message),
              lastMessageAt: new Date(),
            });

      const normalizedEnableKnowledgeBase =
        enableKnowledgeBase ?? config.enableKnowledgeBase;
      const normalizedEnableWeb = enableWeb ?? config.enableWeb;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      sendSse(res, "session", {
        sessionId: String(session._id),
        title: session.title,
      });

      const userMessage = await NoteAiMessage.create({
        sessionId: session._id,
        userId: id,
        role: "user",
        content: message,
        status: "completed",
        sources: [],
      });

      const sources = normalizedEnableKnowledgeBase
        ? await findRelevantNotes(id, message)
        : [];

      sendSse(res, "sources", {
        messageId: String(userMessage._id),
        sources,
        webAccessRequested: normalizedEnableWeb,
      });

      const priorMessages = await NoteAiMessage.find({
        sessionId: session._id,
        userId: id,
      })
        .sort({ createdAt: 1 })
        .lean();

      const knowledgeContext = sources
        .map(
          (source, index) =>
            `[${index + 1}] ${source.title}\n${source.snippet || "(no excerpt)"}`,
        )
        .join("\n\n");

      const modelMessages = buildMessagesForModel({
        history: priorMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        knowledgeContext,
        webRequested: normalizedEnableWeb,
      });

      const abortController = new AbortController();
      res.on("close", () => {
        abortController.abort();
      });

      let assistantContent = "";

      await streamProviderResponse({
        provider,
        baseURL: config.baseURL,
        model: config.model,
        apiKey,
        messages: modelMessages,
        signal: abortController.signal,
        onDelta: (delta) => {
          assistantContent += delta;
          sendSse(res, "delta", { delta });
        },
      });

      const assistantMessage = await NoteAiMessage.create({
        sessionId: session._id,
        userId: id,
        role: "assistant",
        content: assistantContent,
        status: "completed",
        sources,
      });

      session.lastMessageAt = new Date();
      if (!session.title || session.title === "New Chat") {
        session.title = buildSessionTitle(message);
      }
      await session.save();

      sendSse(res, "done", {
        message: toPlainMessage(assistantMessage),
        sources,
        webAccessRequested: normalizedEnableWeb,
      });
      res.end();
    } catch (error: any) {
      if (res.headersSent) {
        sendSse(res, "error", {
          message: error?.message || "AI streaming failed",
        });
        res.end();
        return;
      }

      next(error);
    }
  },
);

export default router;
