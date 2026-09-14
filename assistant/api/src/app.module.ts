import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.ts";
import { RuntimeLifecycleService } from "./lifecycle/runtime-lifecycle.service.ts";
import { ApprovalsModule } from "./features/approvals/approvals.module.ts";
import { ConfigModule } from "./features/settings/config.module.ts";
import { ConversationsModule } from "./features/conversations/conversations.module.ts";
import { ExtensionsModule } from "./features/extensions/extensions.module.ts";
import { HealthModule } from "./features/health/health.module.ts";
import { RunsModule } from "./features/runs/runs.module.ts";
import { UserInputController } from "./features/user-input/user-input.controller.ts";

/**
 * Assistant API 的根模块。
 * 根模块只组合功能模块和全局基础设施，不直接承载对话或模型业务。
 */
@Module({
  imports: [HealthModule, ConversationsModule, RunsModule, ApprovalsModule, ExtensionsModule, ConfigModule],
  providers: [RuntimeLifecycleService, { provide: APP_FILTER, useClass: AllExceptionsFilter }],
  controllers: [UserInputController],
})
export class AppModule {}
