import { Injectable } from "@nestjs/common";
import { runtimeSession, type PreparedRun } from "../runtime/session.js";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "../models/store.js";
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
  /**
   * 列出全部对话（不含消息内容）。
   * @returns 对话摘要列表。
   */
  list(): Promise<Omit<Conversation, "messages">[]> {
    return listConversations();
  }

  /**
   * 创建一个新对话。
   * @returns 新建的对话对象。
   */
  create(): Promise<Conversation> {
    return createConversation();
  }

  /**
   * 按 ID 获取对话。
   * @param id 对话的唯一 ID。
   * @returns 对话对象；不存在时返回 null。
   */
  get(id: string): Promise<Conversation | null> {
    return getConversation(id);
  }

  /**
   * 按 ID 删除对话。
   * @param id 对话的唯一 ID。
   * @returns 是否确实删除了对话。
   */
  delete(id: string): Promise<boolean> {
    return deleteConversation(id);
  }

  /**
   * 判断对话是否正在生成中。
   * @param id 对话的唯一 ID。
   * @returns 存在进行中的 Run 返回 true。
   */
  isActive(id: string): boolean {
    return runtimeSession.isConversationActive(id);
  }

  /**
   * 准备一次消息生成。
   * @param input 生成参数与事件回调。
   * @returns 可执行/停止的 Run 句柄。
   */
  prepareTurn(input: PrepareTurnInput): Promise<PreparedRun> {
    return runtimeSession.prepareTurn(input);
  }
}
