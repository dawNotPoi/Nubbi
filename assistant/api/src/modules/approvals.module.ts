import { Module } from "@nestjs/common";
import { ApprovalsController } from "../controllers/approvals.controller.js";
import { ApprovalsService } from "../services/approvals.service.js";

/** 注册工具审批的 HTTP 入口与应用服务。 */
@Module({ controllers: [ApprovalsController], providers: [ApprovalsService] })
export class ApprovalsModule {}
