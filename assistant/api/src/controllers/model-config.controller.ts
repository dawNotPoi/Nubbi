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
} from "../model/model-config.js";
import { ConfigAccessGuard } from "../common/config-access.guard.js";
import { ModelConfigService } from "../services/model-config.service.js";

/**
 * 统一提取异常消息，非 Error 时回退到默认文案。
 * @param error 捕获的未知异常。
 * @param fallback 无法提取消息时的兜底文案。
 * @returns 异常消息字符串。
 */
const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** 管理模型 Provider 配置以及 ChatGPT 订阅登录流程。 */
@UseGuards(ConfigAccessGuard)
@Controller("model")
export class ModelConfigController {
  constructor(
    @Inject(ModelConfigService) private readonly modelConfig: ModelConfigService,
  ) {}

  /**
   * 读取当前模型配置。
   * @returns 对外可见的配置。
   */
  @Get("config")
  config(): Promise<PublicModelConfig> {
    return this.modelConfig.config();
  }

  /**
   * 保存模型配置。
   * @param input 请求体，经 Schema 校验。
   * @returns 保存后对外可见的配置。
   */
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

  /**
   * 拉取 Provider 可用模型列表。
   * @param input 连接参数。
   * @returns 模型 ID 列表；连接失败时抛 502。
   */
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

  /**
   * 读取 Codex 账号信息。
   * @returns 账号状态；Codex 不可用时抛 503。
   */
  @Get("codex/account")
  async codexAccount(): Promise<Awaited<ReturnType<ModelConfigService["account"]>>> {
    try {
      return await this.modelConfig.account();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "Codex 不可用"));
    }
  }

  /**
   * 发起 Codex 设备码登录。
   * @returns 设备登录信息；无法开始登录时抛 503。
   */
  @Post("codex/login")
  @HttpCode(200)
  async login(): Promise<Awaited<ReturnType<ModelConfigService["login"]>>> {
    try {
      return await this.modelConfig.login();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "无法开始 ChatGPT 登录"));
    }
  }

  /**
   * 退出 Codex 登录。
   * @returns 无返回值；退出失败时抛 503。
   */
  @Post("codex/logout")
  @HttpCode(204)
  async logout(): Promise<void> {
    try {
      await this.modelConfig.logout();
    } catch (error) {
      throw new ServiceUnavailableException(messageOf(error, "退出登录失败"));
    }
  }

  /**
   * 拉取全部 Codex 模型。
   * @returns Codex 模型列表；获取失败时抛 503。
   */
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
