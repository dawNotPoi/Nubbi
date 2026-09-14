import { Controller, Get, Inject } from "@nestjs/common";
import { ExtensionsService, type ExtensionResponse } from "../services/extensions.service.js";

/** 向客户端展示当前可发现的 Skill 与 MCP 服务。 */
@Controller("extensions")
export class ExtensionsController {
  constructor(
    @Inject(ExtensionsService) private readonly extensions: ExtensionsService,
  ) {}

  @Get()
  async list(): Promise<ExtensionResponse> {
    return this.extensions.list();
  }
}
