import { BadRequestException, Body, Controller, Inject, NotFoundException, Param, Patch } from "@nestjs/common";
import { sendMessageSchema } from "./send-message.schema.ts";
import { ConversationsService } from "./conversations.service.ts";
import type { z } from "zod";

const conversationModelSchema = sendMessageSchema.pick({ model: true });
type ConversationModelInput = z.infer<typeof conversationModelSchema>;

/** 会话模型偏好的独立接口，不参与运行中的模型切换。 */
@Controller("conversations")
export class ConversationModelController {
  constructor(@Inject(ConversationsService) private readonly conversations: ConversationsService) {}
  /**
   * 保存下次发送所用的模型，运行中也允许保存。
   * @param id 会话 ID。
   * @param input 模型选择请求，仍需运行时校验。
   * @returns 已保存的模型 ID。
   */
  @Patch(":id/model")
  async update(@Param("id") id: string, @Body() input: ConversationModelInput): Promise<ConversationModelInput> {
    const parsed = conversationModelSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "模型无效");
    if (!(await this.conversations.saveModel(id, parsed.data.model))) throw new NotFoundException("对话不存在");
    return parsed.data;
  }
}
