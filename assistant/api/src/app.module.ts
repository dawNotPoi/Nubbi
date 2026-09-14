import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { RuntimeLifecycleService } from "./lifecycle/runtime-lifecycle.service.js";
import { ApprovalsModule } from "./modules/approvals.module.js";
import { ConfigModule } from "./modules/config.module.js";
import { ConversationsModule } from "./modules/conversations.module.js";
import { ExtensionsModule } from "./modules/extensions.module.js";
import { HealthModule } from "./modules/health.module.js";
import { RunsModule } from "./modules/runs.module.js";

/**
 * Assistant API 的根模块。
 * 根模块只组合功能模块和全局基础设施，不直接承载对话或模型业务。
 */
@Module({
  imports: [
    HealthModule,
    ConversationsModule,
    RunsModule,
    ApprovalsModule,
    ExtensionsModule,
    ConfigModule,
  ],
  providers: [
    RuntimeLifecycleService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
