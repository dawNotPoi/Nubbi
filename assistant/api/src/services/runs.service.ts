import { Injectable } from "@nestjs/common";
import { listRunEvents, listRunSummaries } from "../runtime/run-store.js";
import { runtimeSession } from "../runtime/session.js";
import { getConversation } from "../store.js";
import type { Conversation, RuntimeEvent } from "../types.js";

/** 封装 Run 控制与审计数据查询，避免 Controller 直接访问运行时存储。 */
@Injectable()
export class RunsService {
  stop(conversationId: string): void {
    runtimeSession.stopConversation(conversationId);
  }

  getConversation(conversationId: string): Promise<Conversation | null> {
    return getConversation(conversationId);
  }

  list(conversationId: string): ReturnType<typeof listRunSummaries> {
    return listRunSummaries(conversationId);
  }

  events(runId: string): Promise<RuntimeEvent[]> {
    return listRunEvents(runId);
  }
}
