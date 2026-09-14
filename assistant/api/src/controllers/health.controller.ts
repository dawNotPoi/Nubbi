import { Controller, Get } from "@nestjs/common";

/** 提供不依赖模型和 MCP 的基础存活检查。 */
@Controller("health")
export class HealthController {
  /**
   * 提供不依赖模型和 MCP 的基础存活检查。
   * @returns 固定返回 { status: "ok" }。
   */
  @Get()
  check(): { status: "ok" } {
    return { status: "ok" };
  }
}
