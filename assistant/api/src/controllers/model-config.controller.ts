import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import {
  modelConfigInputSchema,
  modelConnectionInputSchema,
  type PublicModelConfig,
} from "../model-config.js";
import { ConfigAccessGuard } from "../common/config-access.guard.js";
import { ModelConfigService } from "../services/model-config.service.js";

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** 管理模型 Provider 配置以及 ChatGPT 订阅登录流程。 */
@UseGuards(ConfigAccessGuard)
@Controller("model")
export class ModelConfigController {
  constructor(
    @Inject(ModelConfigService) private readonly modelConfig: ModelConfigService,
  ) {}

  @Get("config")
  config(): Promise<PublicModelConfig> {
    return this.modelConfig.config();
  }

  @Put("config")
  async save(@Body() input: unknown): Promise<PublicModelConfig> {
    const parsed = modelConfigInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "配置无效");
    }
    try {
      return await this.modelConfig.save(parsed.data);
    } catch (error) {
      throw new BadRequestException(messageOf(error, "保存模型配置失败"));
    }
  }

  @Post("models")
  @HttpCode(200)
  async models(@Body() input: unknown): Promise<{ models: string[] }> {
    const parsed = modelConnectionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "连接配置无效");
    }
    try {
      return { models: await this.modelConfig.models(parsed.data) };
    } catch (error) {
      throw new BadGatewayException(messageOf(error, "获取模型失败"));
    }
  }

  @Get("codex/account")
  async codexAccount(): Promise<Awaited<ReturnType<ModelConfigService["account"]>>> {
    try {
      return await this.modelConfig.account();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "Codex 不可用"));
    }
  }

  @Post("codex/login")
  @HttpCode(200)
  async login(): Promise<Awaited<ReturnType<ModelConfigService["login"]>>> {
    try {
      return await this.modelConfig.login();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "无法开始 ChatGPT 登录"));
    }
  }

  @Post("codex/logout")
  @HttpCode(204)
  async logout(): Promise<void> {
    try {
      await this.modelConfig.logout();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "退出登录失败"));
    }
  }

  @Get("codex/models")
  async codexModels(): Promise<{
    models: Awaited<ReturnType<ModelConfigService["codexModels"]>>;
  }> {
    try {
      return { models: await this.modelConfig.codexModels() };
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "获取 Codex 模型失败"));
    }
  }
}
