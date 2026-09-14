import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller.ts";
import { ConversationsService } from "./conversations.service.ts";
import { ConversationModelController } from "./conversation-model.controller.ts";

/** 把对话 Controller 与其应用服务封装成独立功能模块。 */
@Module({
  controllers: [ConversationsController, ConversationModelController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
