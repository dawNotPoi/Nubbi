import type { ChatApi } from "./chat-api.ts";
import type { ChatStateStore } from "./chat-state.ts";

/** 会话模型的持久化选择，保存成功才更新展示，旧页面请求不得覆盖新会话。 */
export class ConversationModelSelection {
  private revision = 0;

  /**
   * 绑定聊天状态与会话接口。
   * @param store 当前聊天状态。
   * @param api 平台无关会话接口。
   */
  constructor(private readonly store: ChatStateStore, private readonly api: ChatApi) {}

  /**
   * 切换页面时废弃旧保存回调，服务端已接受的保存仍然保留。
   * @returns 无返回值。
   */
  invalidate(): void {
    this.revision += 1;
    this.store.update({ modelSaving: false });
  }

  /**
   * 保存下次模型；空会话视图先创建会话，生成中不改当前 Run。
   * @param requestedModel 用户选择的模型 ID。
   * @returns 保存结束的 Promise，失败保留原选择并提示。
   */
  select = async (requestedModel: string): Promise<void> => {
    const state = this.store.getSnapshot();
    if (state.loading || state.modelSaving || (state.generating && !state.traceRunId)) return;
    const model = requestedModel.trim();
    if (!model || model === state.selectedConversation?.model) return;
    const revision = ++this.revision;
    this.store.update({ modelSaving: true, error: null });
    try {
      const conversation = state.selectedConversation ?? await this.api.createConversation();
      if (revision !== this.revision) return;
      const saved = await this.api.updateConversationModel(conversation.id, model);
      if (revision !== this.revision) return;
      const current = this.store.getSnapshot();
      this.store.update({
        selectedConversation: { ...(current.selectedConversation ?? conversation), model: saved.model },
        conversations: current.conversations.some((item) => item.id === conversation.id)
          ? current.conversations.map((item) => item.id === conversation.id ? { ...item, model: saved.model } : item)
          : [{ ...conversation, model: saved.model }, ...current.conversations],
      });
    } catch (error) {
      if (revision === this.revision)
        this.store.update({ error: error instanceof Error ? error.message : "保存会话模型失败" });
    } finally {
      if (revision === this.revision) this.store.update({ modelSaving: false });
    }
  };
}
