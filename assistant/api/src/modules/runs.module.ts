import { Module } from "@nestjs/common";
import { RunsController } from "../controllers/runs.controller.js";
import { RunsService } from "../services/runs.service.js";

/** 注册生成控制和 Run 审计能力。 */
@Module({ controllers: [RunsController], providers: [RunsService] })
export class RunsModule {}
