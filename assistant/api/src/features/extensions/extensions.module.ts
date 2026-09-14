import { Module } from "@nestjs/common";
import { ExtensionsController } from "./extensions.controller.ts";
import { ExtensionsService } from "./extensions.service.ts";

/** 注册 Assistant 扩展能力查询。 */
@Module({ controllers: [ExtensionsController], providers: [ExtensionsService] })
export class ExtensionsModule {}
