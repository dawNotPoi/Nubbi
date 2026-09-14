import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { ApprovalsService } from "../services/approvals.service.js";

const approvalSchema = z.object({ approved: z.boolean() });

/** 接收客户端对一次性工具审批的决定。 */
@Controller("approvals")
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
  ) {}

  /**
   * 接收客户端对一次性工具审批的决定。
   * @param id 审批 ID。
   * @param input 请求体，含批准/拒绝标记。
   * @returns 无返回值；审批不存在时抛 404。
   */
  @Post(":id")
  @HttpCode(204)
  resolve(@Param("id") id: string, @Body() input: unknown): void {
    // 外部请求始终先经过 Schema 校验，避免把不可信数据传入 Runtime。
    const body = approvalSchema.safeParse(input);
    if (!body.success) throw new BadRequestException("审批结果无效");
    if (this.approvals.resolve(id, body.data.approved) === "missing") {
      throw new NotFoundException("审批不存在或已结束");
    }
  }
}
