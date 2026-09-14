import { Injectable } from "@nestjs/common";
import { runCoordinator, type PreparedRun, type PrepareRunInput } from "../../runtime/run-coordinator.ts";
import { readModelConfig } from "../settings/model-config.repository.ts";
import { saveConversationModel } from "./conversation-model.repository.ts";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from "./conversation.repository.ts";
import type { Conversation } from "../../types.ts";

/**
 * 对话应用服务。
 * 它隔离 Nest Controller 与框架无关的 Store、RunCoordinator 单例。
 */
@Injectable()
export class ConversationsService {
  /**
   * 保存会话的下次模型，不修改正在运行的任务。
   * @param id 会话 ID。
   * @param model 模型 ID。
   * @returns 是否找到并更新会话。
   */
  saveModel(id: string, model: string): Promise<boolean> {
    return saveConversationModel(id, model);
  }
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
  async create(): Promise<Conversation> {
    return createConversation((await readModelConfig()).model);
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
    return runCoordinator.isConversationActive(id);
  }

  /**
   * 准备一次消息生成。
   * @param input 生成参数与事件回调。
   * @returns 可执行/停止的 Run 句柄。
   */
  prepareRun(input: PrepareRunInput): Promise<PreparedRun> {
    return runCoordinator.prepareRun(input);
  }
}
