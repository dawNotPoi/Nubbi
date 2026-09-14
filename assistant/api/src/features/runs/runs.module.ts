import { Module } from "@nestjs/common";
import { RunsController } from "./runs.controller.ts";
import { RunsService } from "./runs.service.ts";

/** 注册生成控制和 Run 审计能力。 */
@Module({ controllers: [RunsController], providers: [RunsService] })
export class RunsModule {}
