import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller.ts";
import { ConversationsService } from "./conversations.service.ts";

/** 把对话 Controller 与其应用服务封装成独立功能模块。 */
@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
