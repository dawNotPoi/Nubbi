import { Injectable } from "@nestjs/common";
import { runtimeSession, type PreparedRun } from "../runtime/session.js";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "../store.js";
import type { Conversation, RuntimeEvent } from "../types.js";

type PrepareTurnInput = {
  conversationId: string;
  content: string;
  onEvent: (event: RuntimeEvent) => void;
};

/**
 * 对话应用服务。
 * 它隔离 Nest Controller 与框架无关的 Store、RuntimeSession 单例。
 */
@Injectable()
export class ConversationsService {
  list(): Promise<Omit<Conversation, "messages">[]> {
    return listConversations();
  }

  create(): Promise<Conversation> {
    return createConversation();
  }

  get(id: string): Promise<Conversation | null> {
    return getConversation(id);
  }

  delete(id: string): Promise<boolean> {
    return deleteConversation(id);
  }

  isActive(id: string): boolean {
    return runtimeSession.isConversationActive(id);
  }

  prepareTurn(input: PrepareTurnInput): Promise<PreparedRun> {
    return runtimeSession.prepareTurn(input);
  }
}
