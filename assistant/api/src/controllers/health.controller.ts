import { Controller, Get } from "@nestjs/common";

/** 提供不依赖模型和 MCP 的基础存活检查。 */
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: "ok" } {
    return { status: "ok" };
  }
}
