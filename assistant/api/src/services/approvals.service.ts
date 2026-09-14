import { Injectable } from "@nestjs/common";
import { resolveApproval } from "../runtime/approvals.js";

/** 将 HTTP 审批决定转交给正在等待的 Tool Gateway。 */
@Injectable()
export class ApprovalsService {
  /**
   * 将 HTTP 审批决定转交给等待中的工具调用。
   * @param id 审批 ID。
   * @param approved 用户的决定。
   * @returns 处理结果（已解决或不存在）。
   */
  resolve(id: string, approved: boolean): "resolved" | "missing" {
    return resolveApproval(id, approved);
  }
}
