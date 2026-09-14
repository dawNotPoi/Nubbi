import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import "reflect-metadata";
import { AppModule } from "./app.module.js";
import { env } from "./env.js";

const logger = new Logger("Bootstrap");

/**
 * 创建 Nest 应用并选择 Fastify 作为 HTTP 适配器。
 * 数据库连接等业务初始化由 Nest 生命周期服务完成，入口只保留传输层配置。
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1_048_576 }),
  );
  app.setGlobalPrefix("api");
  app.enableCors({
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await app.listen(env.PORT, "0.0.0.0");
  logger.log(`Assistant API listening on http://localhost:${env.PORT}`);
};

void bootstrap().catch((error: unknown) => {
  logger.error(
    "Assistant API 启动失败",
    error instanceof Error ? error.stack : error,
  );
  process.exitCode = 1;
});
