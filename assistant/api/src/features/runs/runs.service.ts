import { Injectable } from "@nestjs/common";
import { listRunEvents, listRunSummaries } from "./run.repository.ts";
import { runCoordinator } from "../../runtime/run-coordinator.ts";
import { getConversation } from "../conversations/conversation.repository.ts";
import type { Conversation, RuntimeEvent } from "../../types.ts";

/** 封装 Run 控制与审计数据查询，避免 Controller 直接访问运行时存储。 */
@Injectable()
export class RunsService {
  /**
   * 停止指定对话的生成任务。
   * @param conversationId 对话的唯一 ID。
   * @returns 无返回值。
   */
  stop(conversationId: string): void {
    runCoordinator.stopConversation(conversationId);
  }

  /**
   * 获取对话，用于存在性校验。
   * @param conversationId 对话的唯一 ID。
   * @returns 对话对象；不存在时返回 null。
   */
  getConversation(conversationId: string): Promise<Conversation | null> {
    return getConversation(conversationId);
  }

  /**
   * 查询对话的全部 Run 审计摘要。
   * @param conversationId 对话的唯一 ID。
   * @returns Run 摘要列表，按开始时间倒序。
   */
  list(conversationId: string): ReturnType<typeof listRunSummaries> {
    return listRunSummaries(conversationId);
  }

  /**
   * 查询指定 Run 的全部事件。
   * @param runId Run 的唯一 ID。
   * @returns 该 Run 的运行时事件列表。
   */
  events(runId: string): Promise<RuntimeEvent[]> {
    return listRunEvents(runId);
  }
}
