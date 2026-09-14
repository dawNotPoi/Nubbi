import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { ConfigAccessGuard } from "../common/config-access.guard.js";
import { ExtensionsService, type ExtensionResponse } from "../services/extensions.service.js";

const skillEnabledSchema = z.object({ enabled: z.boolean() });

/** 向客户端展示当前可发现的 Skill 与 MCP 服务，并支持启停 Skill。 */
@Controller("extensions")
export class ExtensionsController {
  constructor(
    @Inject(ExtensionsService) private readonly extensions: ExtensionsService,
  ) {}

  /**
   * 返回当前可发现的 Skill 与 MCP 服务。
   * @returns 能力视图（含启用状态的 Skill 列表 + 服务列表）。
   */
  @Get()
  async list(): Promise<ExtensionResponse> {
    return this.extensions.list();
  }

  /**
   * 更新单个 Skill 的启用状态。
   * @param name 技能名称。
   * @param input 请求体，含 enabled 标记。
   * @returns 更新后的技能启用状态；技能不存在时抛 404。
   */
  @UseGuards(ConfigAccessGuard)
  @Put("skills/:name/enabled")
  @HttpCode(200)
  async setSkillEnabled(
    @Param("name") name: string,
    @Body() input: unknown,
  ): Promise<{ name: string; enabled: boolean }> {
    const parsed = skillEnabledSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException("启停状态无效");
    const updated = await this.extensions.toggleSkill(name, parsed.data.enabled);
    if (!updated) throw new NotFoundException("技能不存在");
    return updated;
  }
}
