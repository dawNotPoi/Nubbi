import { Module } from "@nestjs/common";
import { ExtensionsController } from "../controllers/extensions.controller.js";
import { ExtensionsService } from "../services/extensions.service.js";

/** 注册 Assistant 扩展能力查询。 */
@Module({ controllers: [ExtensionsController], providers: [ExtensionsService] })
export class ExtensionsModule {}
