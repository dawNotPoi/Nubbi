import { Module } from "@nestjs/common";
import { ConfigAccessGuard } from "../../common/config-access.guard.ts";
import { McpConfigController } from "./mcp-config.controller.ts";
import { ModelConfigController } from "./model-config.controller.ts";
import { McpConfigService } from "./mcp-config.service.ts";
import { ModelConfigService } from "./model-config.service.ts";

/**
 * 配置功能模块。
 * Guard 与配置 Service 只在本模块注册，避免管理能力泄漏到普通对话接口。
 */
@Module({
  controllers: [McpConfigController, ModelConfigController],
  providers: [ConfigAccessGuard, McpConfigService, ModelConfigService],
})
export class ConfigModule {}
