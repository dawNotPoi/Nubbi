import type { ActiveGeneration, ChatApi } from "./chat-api.ts";

import { ChatStateStore, createChatViewState, createRunViewPatch, reduceChatEvent } from "./chat-state.ts";
import { createPendingMessage } from "./message-state.ts";

/** 两端共用的聊天业务状态机，UI 自行订阅与展示。 */
export class ChatSession {
  public readonly store = new ChatStateStore();
  private revision = 0;
  private listRevision = 0;
  private activeGeneration: ActiveGeneration | null = null;

  /**
   * 绑定业务客户端。
   * @param api 平台已配置的请求方法。
   */
  public constructor(private readonly api: ChatApi) {}

  /**
   * 首次加载，移动端可自动打开最近对话。
   * @param selectLatest 是否选择最近对话。
   * @returns 加载完成的 Promise。
   */
  public async initialize(selectLatest: boolean): Promise<void> {
    const revision = ++this.revision;
    this.store.update({ loading: true });
    try {
      const conversations = await this.refreshConversations();
      if (revision === this.revision && selectLatest && conversations[0])
        await this.selectConversation(conversations[0].id);
    } catch (error) {
      if (revision === this.revision) this.reportError(error);
    } finally {
      if (revision === this.revision) this.store.update({ loading: false });
    }
  }

  /**
   * 关闭连接并废弃尚未返回的请求。
   * @returns 无返回值。
   */
  public dispose(): void {
    this.revision += 1;
    this.listRevision += 1;
    this.cancelLocalGeneration();
  }

  /**
   * 选择对话，无 ID 表示空聊天视图。
   * @param conversationId 待加载的对话 ID。
   * @returns 加载完成的 Promise。
   */
  public selectConversation = async (conversationId?: string): Promise<void> => {
    this.cancelLocalGeneration();
    const revision = ++this.revision;
    this.store.update({ ...createChatViewState(), conversations: this.store.getSnapshot().conversations });
    try {
      const conversation = conversationId ? await this.api.getConversation(conversationId) : null;
      if (revision === this.revision) this.store.update({ selectedConversation: conversation });
    } catch (error) {
      if (revision === this.revision) this.reportError(error);
    } finally {
      if (revision === this.revision) this.store.update({ loading: false });
    }
  };

  /**
   * 创建或续接对话并接收回复，同步占位防止双击重复发送。
   * @param content 用户输入。
   * @returns 发送结束的 Promise。
   */
  public sendMessage = async (content: string): Promise<void> => {
    const text = content.trim();
    if (!text || this.activeGeneration) return;
    const generation: ActiveGeneration = { revision: ++this.revision, controller: new AbortController() };
    this.activeGeneration = generation;
    this.store.update(createRunViewPatch());
    try {
      const conversation = this.store.getSnapshot().selectedConversation ?? (await this.api.createConversation());
      if (!this.isCurrent(generation)) return;
      generation.conversationId = conversation.id;
      this.store.update({
        selectedConversation: conversation,
        pendingMessages: [
          createPendingMessage("user", [{ type: "text", text }]),
          createPendingMessage("assistant", []),
        ],
      });
      await this.api.streamMessage({
        conversationId: conversation.id,
        content: text,
        signal: generation.controller.signal,
        onEvent: (event) => {
          if (!this.isCurrent(generation)) return;
          if (event.runId && generation.runId && event.runId !== generation.runId) return;
          if (event.runId) generation.runId = event.runId;
          this.store.update(reduceChatEvent(this.store.getSnapshot(), event));
        },
      });
      const savedConversation = await this.api.getConversation(conversation.id);
      if (!this.isCurrent(generation)) return;
      this.store.update({ selectedConversation: savedConversation, pendingMessages: [], runTokenUsage: null });
      await this.refreshConversations();
    } catch (error) {
      if (this.isCurrent(generation)) this.reportError(error);
    } finally {
      await generation.stopRequest;
      if (this.activeGeneration === generation) {
        this.activeGeneration = null;
        this.store.update({ generating: false, approval: null });
      }
    }
  };

  /**
   * 停止捕获的运行，而不是停止后来选中的对话。
   * @returns 停止请求完成的 Promise。
   */
  public stopGeneration = async (): Promise<void> => {
    const generation = this.activeGeneration;
    this.store.update({ approval: null });
    if (!generation?.conversationId || !generation.runId) {
      generation?.controller.abort();
      return;
    }
    // 保留 SSE 接收最终保存结果；任务清理完成前不开放重新发送。
    generation.stopRequest ??= this.api
      .stopGeneration(generation.conversationId)
      .catch(() => generation.controller.abort());
    await generation.stopRequest;
  };

  /**
   * 提交指定审批，过期弹窗不得批准后续审批。
   * @param approved 用户决定。
   * @param approvalId 弹窗绑定的 ID，默认使用当前审批。
   * @returns 提交完成的 Promise。
   */
  public decideApproval = async (
    approved: boolean,
    approvalId = this.store.getSnapshot().approval?.approvalId,
  ): Promise<void> => {
    if (!approvalId || approvalId !== this.store.getSnapshot().approval?.approvalId) return;
    const revision = this.revision;
    this.store.update({ approval: null });
    try {
      await this.api.resolveApproval(approvalId, approved);
    } catch (error) {
      if (revision === this.revision) this.reportError(error);
    }
  };

  /**
   * 删除对话并刷新列表，确认弹窗由平台处理。
   * @param conversationId 对话 ID。
   * @returns 删除完成的 Promise。
   */
  public deleteConversation = async (conversationId: string): Promise<void> => {
    await this.api.deleteConversation(conversationId);
    if (this.store.getSnapshot().selectedConversation?.id === conversationId) await this.selectConversation();
    await this.refreshConversations();
  };

  /** 旧的列表请求不能覆盖新的请求结果。 */
  private async refreshConversations(): Promise<Awaited<ReturnType<ChatApi["listConversations"]>>> {
    const revision = ++this.listRevision;
    const conversations = await this.api.listConversations();
    if (revision === this.listRevision) this.store.update({ conversations });
    return conversations;
  }

  /** 判断回调是否仍属于当前未取消的请求。 */
  private isCurrent(generation: ActiveGeneration): boolean {
    return (
      this.activeGeneration === generation &&
      generation.revision === this.revision &&
      !generation.controller.signal.aborted
    );
  }

  /** 废弃本地流，服务端通过连接关闭停止对应任务。 */
  private cancelLocalGeneration(): void {
    this.activeGeneration?.controller.abort();
    this.activeGeneration = null;
  }

  /** 把未知异常转换为界面文案。 */
  private reportError(error: unknown): void {
    this.store.update({ error: error instanceof Error ? error.message : "请求失败" });
  }
}
