import type { AgentEvent, MessagePart } from "@nubbi/assistant-shared/contracts";

/** 收集运行中的可见内容，异常退出时也能保存已产生的输出。 */
export class RunMessageCollector {
  private parts: MessagePart[] = [];
  private readonly approvals = new Map<string, Extract<AgentEvent, { type: "approval-request" }>>();

  /**
   * 记录业务事件；不保存模型私有续接信息。
   * @param event 当前运行的事件。
   * @returns 无返回值。
   */
  public record(event: AgentEvent): void {
    if (event.type === "text-delta" || event.type === "reasoning-delta") {
      const type = event.type === "text-delta" ? "text" : "reasoning";
      const previous = this.parts.at(-1);
      if (previous?.type === type) previous.text += event.text;
      else this.parts.push({ type, text: event.text });
    } else if (event.type === "skill-active") {
      this.parts.push({ type: "skill", name: event.name, description: event.description });
    } else if (event.type === "tool-start") {
      this.parts.push({
        type: "tool",
        callId: event.callId,
        server: event.server,
        tool: event.tool,
        arguments: event.arguments,
        result: "工具执行未完成",
        success: false,
      });
    } else if (event.type === "tool-result") {
      const index = this.parts.findIndex(
        (part) => part.type === "tool" && event.callId !== undefined && part.callId === event.callId,
      );
      const previous = index >= 0 ? this.parts[index] : undefined;
      const part: MessagePart = {
        type: "tool",
        callId: event.callId,
        server: event.server,
        tool: event.tool,
        arguments: previous?.type === "tool" ? previous.arguments : {},
        result: event.result,
        success: event.success,
        durationMs: event.durationMs,
      };
      if (index >= 0) this.parts[index] = part;
      else this.parts.push(part);
    } else if (event.type === "approval-request") this.approvals.set(event.approvalId, event);
    else if (event.type === "approval-resolved") {
      const request = this.approvals.get(event.approvalId);
      if (request)
        this.parts.push({
          type: "approval",
          approvalId: event.approvalId,
          server: request.server,
          tool: request.tool,
          arguments: request.arguments,
          approved: event.approved,
        });
      this.approvals.delete(event.approvalId);
    }
  }

  /**
   * 返回有序内容快照，正常完成时补回执行器记录的参数（包括非法输入）。
   * @param completedParts 执行器返回的内容；失败或取消时可以省略。
   * @returns 不与收集器共享数组的消息内容。
   */
  public snapshot(completedParts: MessagePart[] = []): MessagePart[] {
    return this.parts.map((part) => {
      if (part.type !== "tool" || !part.callId) return { ...part };
      const completed = completedParts.find(
        (candidate) => candidate.type === "tool" && candidate.callId === part.callId,
      );
      return completed?.type === "tool" ? { ...part, arguments: completed.arguments } : { ...part };
    });
  }
}
