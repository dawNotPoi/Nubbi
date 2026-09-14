import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ConfigAccessGuard } from "../common/config-access.guard.js";
import {
  mcpServerSchema,
  type McpServerConfig,
} from "../mcp-config.js";
import { McpConfigService } from "../services/mcp-config.service.js";

/**
 * 统一提取异常消息，非 Error 时回退到默认文案。
 * @param error 捕获的未知异常。
 * @param fallback 无法提取消息时的兜底文案。
 * @returns 异常消息字符串。
 */
const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * 校验 MCP 服务配置并抛出统一的 400 异常。
 * @param input 客户端提交的未知结构配置。
 * @returns 校验通过的服务配置。
 */
const parseServer = (input: unknown) => {
  const result = mcpServerSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException(result.error.issues[0]?.message ?? "配置无效");
  }
  return result.data;
};

/**
 * MCP 配置 HTTP 边界。
 * Guard 负责权限，Controller 负责校验和状态码，Service 负责配置变更。
 */
@UseGuards(ConfigAccessGuard)
@Controller("mcp")
export class McpConfigController {
  constructor(
    @Inject(McpConfigService) private readonly mcpConfig: McpConfigService,
  ) {}

  /**
   * 列出全部 MCP 服务配置。
   * @returns 服务配置列表。
   */
  @Get("servers")
  list(): Promise<McpServerConfig[]> {
    return this.mcpConfig.list();
  }

  /**
   * 新建 MCP 服务。
   * @param input 服务配置。
   * @returns 已保存的服务配置；ID 冲突时抛 409。
   */
  @Post("servers")
  async create(@Body() input: unknown): Promise<McpServerConfig> {
    try {
      return await this.mcpConfig.create(parseServer(input));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = messageOf(error, "保存 MCP 配置失败");
      if (message.includes("已存在")) throw new ConflictException(message);
      throw new BadRequestException(message);
    }
  }

  /**
   * 更新 MCP 服务。
   * @param id 待更新服务的 ID。
   * @param input 新的服务配置。
   * @returns 已保存的服务配置；服务不存在时抛 404。
   */
  @Put("servers/:id")
  async update(
    @Param("id") id: string,
    @Body() input: unknown,
  ): Promise<McpServerConfig> {
    try {
      return await this.mcpConfig.update(id, parseServer(input));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = messageOf(error, "更新 MCP 配置失败");
      if (message.includes("不存在")) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  /**
   * 删除 MCP 服务。
   * @param id 待删除服务的 ID。
   * @returns 无返回值；服务不存在时抛 404。
   */
  @Delete("servers/:id")
  @HttpCode(204)
  async delete(@Param("id") id: string): Promise<void> {
    const deleted = await this.mcpConfig.delete(id);
    if (!deleted) throw new NotFoundException("MCP 服务不存在");
  }

  /**
   * 测试连接 MCP 服务。
   * @param input 待测试的服务配置。
   * @returns 连接与工具发现结果；连接失败时抛 502。
   */
  @Post("test")
  @HttpCode(200)
  async test(
    @Body() input: unknown,
  ): Promise<Awaited<ReturnType<McpConfigService["test"]>>> {
    try {
      return await this.mcpConfig.test(parseServer(input));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException(messageOf(error, "MCP 连接失败"));
    }
  }
}
