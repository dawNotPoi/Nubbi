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

  /**
   * 停止指定对话的生成任务。
   * @param conversationId 对话的唯一 ID。
   * @returns 无返回值。
   */
  @Post("conversations/:id/generations/stop")
  @HttpCode(204)
  stop(@Param("id") conversationId: string): void {
    this.runs.stop(conversationId);
  }

  /**
   * 查询对话的全部 Run 摘要。
   * @param conversationId 对话的唯一 ID。
   * @returns Run 摘要列表；对话不存在时抛 404。
   */
  @Get("conversations/:id/runs")
  async list(@Param("id") conversationId: string): Promise<RunSummary[]> {
    if (!await this.runs.getConversation(conversationId)) {
      throw new NotFoundException("对话不存在");
    }
    return this.runs.list(conversationId);
  }

  /**
   * 查询指定 Run 的全部事件。
   * @param runId Run 的唯一 ID。
   * @returns 该 Run 的事件列表；没有事件时抛 404。
   */
  @Get("runs/:id/events")
  async events(@Param("id") runId: string): Promise<RuntimeEvent[]> {
    const events = await this.runs.events(runId);
    if (!events.length) throw new NotFoundException("Run 不存在");
    return events;
  }
}
