import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.ts";

/** 注册基础健康检查接口。 */
@Module({ controllers: [HealthController] })
export class HealthModule {}
