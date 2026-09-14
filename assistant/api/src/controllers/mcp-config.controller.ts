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

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

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

  @Get("servers")
  list(): Promise<McpServerConfig[]> {
    return this.mcpConfig.list();
  }

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

  @Delete("servers/:id")
  @HttpCode(204)
  async delete(@Param("id") id: string): Promise<void> {
    const deleted = await this.mcpConfig.delete(id);
    if (!deleted) throw new NotFoundException("MCP 服务不存在");
  }

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
