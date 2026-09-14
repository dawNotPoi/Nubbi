import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import "reflect-metadata";
import { AppModule } from "./app.module.ts";
import { env } from "./config/env.ts";

const logger = new Logger("Bootstrap");

/**
 * 覆盖 Fastify 默认的 JSON 解析器：空 body 返回 undefined 而不是直接拒绝。
 * 部分客户端（旧缓存、第三方工具）会带 JSON content-type 发空 body 的 POST/DELETE，
 * 默认解析器会直接抛「Body cannot be empty」；这里宽容处理，由各路由自行校验。
 * @param app 已创建但未监听的 Nest Fastify 应用实例。
 * @returns 无返回值。
 */
const tolerateEmptyJsonBody = (app: NestFastifyApplication): void => {
  // useBodyParser 会标记解析器已注册，避免 Nest init 阶段再次注册默认 JSON 解析器而冲突。
  app.useBodyParser("application/json", { bodyLimit: 1_048_576 }, (_request, body, done) => {
    try {
      const text = typeof body === "string" ? body : body.toString();
      done(null, text.length > 0 ? JSON.parse(text) : undefined);
    } catch (error) {
      done(error as Error, undefined);
    }
  });
};

/**
 * 创建 Nest 应用并选择 Fastify 作为 HTTP 适配器。
 * 数据库连接等业务初始化由 Nest 生命周期服务完成，入口只保留传输层配置。
 * @returns 服务启动完成后的 Promise。
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 1_048_576 }));
  // 宽容处理空 JSON body，避免旧客户端发起的空 body 请求直接被 400。
  tolerateEmptyJsonBody(app);
  app.setGlobalPrefix("api");
  app.enableCors({
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await app.listen(env.PORT, "0.0.0.0");
  logger.log(`Assistant API listening on http://localhost:${env.PORT}`);
};

void bootstrap().catch((error: unknown) => {
  logger.error("Assistant API 启动失败", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
