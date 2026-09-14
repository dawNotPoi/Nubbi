import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { z } from "zod";
import {
  RuntimeConflictError,
  type PreparedRun,
} from "../runtime/session.js";
import { ConversationsService } from "../services/conversations.service.js";
import type { Conversation, RuntimeEvent } from "../types.js";

// 拒绝含 U+FFFD（替换字符）的消息：说明客户端未按 UTF-8 发送，避免把乱码存进对话历史。
const messageSchema = z.object({
  content: z.string().trim().min(1).max(20_000).refine(
    (value) => !value.includes("\uFFFD"),
    "消息内容包含无法识别的字符，请检查输入编码",
  ),
});

/**
 * 手动接管 Fastify 响应所需的最小类型，仅声明用到的两个成员：
 * - raw：Fastify reply 底层的 Node 原生 HTTP 响应对象，用于流式写入与监听连接关闭；
 * - hijack：让 Fastify 放弃对响应的控制，改由原生流自行写、自行 end。
 * 采用结构化类型而非完整 Reply 类型，避免与平台适配器强耦合。
 */
type StreamingReply = {
  raw: ServerResponse;
  hijack: () => void;
};

/**
 * 按 SSE（Server-Sent Events）协议格式写出一条事件，连接已结束则直接跳过。
 * @param response 底层 Node HTTP 响应对象。
 * @param event 事件类型名，客户端据此分发。
 * @param data 事件负载，序列化为 JSON 写入 data 字段。
 * @returns 无返回值。
 */
const sendEvent = (response: ServerResponse, event: string, data: unknown): void => {
  if (response.writableEnded || response.destroyed) return;
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * 对话的 HTTP 入口。
 * 普通 CRUD 交给 Nest 序列化，消息生成则桥接 Runtime 事件与 SSE 数据流。
 */
@Controller("conversations")
export class ConversationsController {
  constructor(
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
  ) {}

  /**
   * 列出全部对话。
   * @returns 对话摘要列表。
   */
  @Get()
  list(): Promise<Omit<Conversation, "messages">[]> {
    return this.conversations.list();
  }

  /**
   * 创建一个新对话。
   * @returns 新建的对话对象。
   */
  @Post()
  create(): Promise<Conversation> {
    return this.conversations.create();
  }

  /**
   * 获取指定对话。
   * @param id 对话的唯一 ID。
   * @returns 对话对象；不存在时抛 404。
   */
  @Get(":id")
  async get(@Param("id") id: string): Promise<Conversation> {
    const conversation = await this.conversations.get(id);
    if (!conversation) throw new NotFoundException("对话不存在");
    return conversation;
  }

  /**
   * 删除指定对话；正在生成中的对话返回 409。
   * @param id 对话的唯一 ID。
   * @returns 无返回值；不存在时抛 404。
   */
  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id") id: string): Promise<void> {
    if (this.conversations.isActive(id)) {
      throw new ConflictException("请先停止当前对话的生成任务");
    }
    if (!await this.conversations.delete(id)) throw new NotFoundException("对话不存在");
  }

  /**
   * 发送用户消息并以 SSE 流式返回助手输出。
   * @param conversationId 对话的唯一 ID。
   * @param input 请求体，含消息内容。
   * @param reply 手动控制的 Fastify 响应。
   * @returns 无返回值，结果通过 SSE 流式写入。
   */
  @Post(":id/messages")
  async send(
    @Param("id") conversationId: string,
    @Body() input: unknown,
    // @Res() 未传 passthrough:true，表示本路由的响应完全由手动控制，
    // NestJS 不会自动发送返回值，这正是 SSE 流式输出所需的自由度。
    @Res() reply: StreamingReply,
  ): Promise<void> {
    const body = messageSchema.safeParse(input);
    if (!body.success) throw new BadRequestException("消息内容无效");
    if (!await this.conversations.get(conversationId)) {
      throw new NotFoundException("对话不存在");
    }

    // 通过原生 ServerResponse 手动写 SSE 事件，并监听客户端断开连接。
    const response = reply.raw;
    let run: PreparedRun | undefined;
    let connectionClosed = false;
    // 手机断网或主动取消请求时立即停止对应 Run，避免模型继续消耗资源。
    response.on("close", () => {
      connectionClosed = true;
      run?.stop();
    });

    try {
      run = await this.conversations.prepareTurn({
        conversationId,
        content: body.data.content,
        onEvent: (event: RuntimeEvent) => sendEvent(response, event.type, event),
      });
    } catch (error) {
      if (error instanceof RuntimeConflictError) throw new ConflictException(error.message);
      throw error;
    }

    // Runtime 准备完成后接管 Fastify 响应，由 Node 原生流持续写入自定义 SSE 事件。
    reply.hijack();
    response.statusCode = 200;
    // SSE 响应头：需保持长连接，且禁止缓冲（如 nginx 的 proxy_buffering）与转换。
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    // 立即刷新响应头，让客户端尽早建立 SSE 连接，避免等到首个事件才收到。
    response.flushHeaders();
    sendEvent(response, "message-start", { conversationId, runId: run.runId });
    // 若 prepareTurn 期间连接已断开，则不再执行 Run。
    if (connectionClosed) run.stop();

    try {
      const outcome = await run.execute();
      // 生成失败也以 SSE 事件上报，前端可据此展示错误而非断流。
      if (outcome.error) sendEvent(response, "error", { message: outcome.error, runId: run.runId });
      sendEvent(response, "done", { message: outcome.message, runId: run.runId });
    } finally {
      // 无论执行成功与否都主动结束响应，关闭 SSE 连接。
      response.end();
    }
  }
}
