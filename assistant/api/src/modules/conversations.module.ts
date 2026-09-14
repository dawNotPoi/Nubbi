import { Module } from "@nestjs/common";
import { ConversationsController } from "../controllers/conversations.controller.js";
import { ConversationsService } from "../services/conversations.service.js";

/** 把对话 Controller 与其应用服务封装成独立功能模块。 */
@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
