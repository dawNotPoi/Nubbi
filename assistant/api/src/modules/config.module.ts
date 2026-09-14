import { Module } from "@nestjs/common";
import { ConfigAccessGuard } from "../common/config-access.guard.js";
import { McpConfigController } from "../controllers/mcp-config.controller.js";
import { ModelConfigController } from "../controllers/model-config.controller.js";
import { McpConfigService } from "../services/mcp-config.service.js";
import { ModelConfigService } from "../services/model-config.service.js";

/**
 * 配置功能模块。
 * Guard 与配置 Service 只在本模块注册，避免管理能力泄漏到普通对话接口。
 */
@Module({
  controllers: [McpConfigController, ModelConfigController],
  providers: [ConfigAccessGuard, McpConfigService, ModelConfigService],
})
export class ConfigModule {}
