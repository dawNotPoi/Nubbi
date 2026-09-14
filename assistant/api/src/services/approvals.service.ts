import { Injectable } from "@nestjs/common";
import { resolveApproval } from "../approvals.js";

/** 将 HTTP 审批决定转交给正在等待的 Tool Gateway。 */
@Injectable()
export class ApprovalsService {
  resolve(id: string, approved: boolean): "resolved" | "missing" {
    return resolveApproval(id, approved);
  }
}
