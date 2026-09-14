import { Module } from "@nestjs/common";
import { ApprovalsController } from "./approvals.controller.ts";
import { ApprovalsService } from "./approvals.service.ts";

/** 注册工具审批的 HTTP 入口与应用服务。 */
@Module({ controllers: [ApprovalsController], providers: [ApprovalsService] })
export class ApprovalsModule {}
