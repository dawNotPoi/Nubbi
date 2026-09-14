import {
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import type { RunSummary } from "../runtime/events.js";
import { RunsService } from "../services/runs.service.js";
import type { RuntimeEvent } from "../types.js";

/** 管理生成任务的停止操作，并提供 Run 审计查询。 */
@Controller()
export class RunsController {
  constructor(@Inject(RunsService) private readonly runs: RunsService) {}

  @Post("conversations/:id/generations/stop")
  @HttpCode(204)
  stop(@Param("id") conversationId: string): void {
    this.runs.stop(conversationId);
  }

  @Get("conversations/:id/runs")
  async list(@Param("id") conversationId: string): Promise<RunSummary[]> {
    if (!await this.runs.getConversation(conversationId)) {
      throw new NotFoundException("对话不存在");
    }
    return this.runs.list(conversationId);
  }

  @Get("runs/:id/events")
  async events(@Param("id") runId: string): Promise<RuntimeEvent[]> {
    const events = await this.runs.events(runId);
    if (!events.length) throw new NotFoundException("Run 不存在");
    return events;
  }
}
