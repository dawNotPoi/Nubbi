import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { ServerResponse } from "node:http";

type FastifyReply = {
  sent: boolean;
  raw: ServerResponse;
  code: (status: number) => FastifyReply;
  send: (payload: unknown) => void;
};

/**
 * 从各种异常中提取可展示给客户端的消息。
 * @param exception 捕获的未知异常。
 * @returns 异常消息字符串。
 */
const exceptionMessage = (exception: unknown): string => {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === "string") return body;
    if (typeof body === "object" && body && "message" in body) {
      const message = body.message;
      if (typeof message === "string") return message;
      if (Array.isArray(message) && typeof message[0] === "string") return message[0];
    }
  }
  return exception instanceof Error ? exception.message : "服务器内部错误";
};

/**
 * 将 Nest 异常统一转换为客户端已经使用的 `{ message }` 格式。
 * 对已经开始发送的 SSE 响应不能再写 JSON，只能关闭底层流。
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * 将异常统一转换为客户端已使用的 { message } 格式。
   * @param exception 捕获的异常。
   * @param host Nest 参数宿主，用于取出响应对象。
   * @returns 无返回值，结果直接写入响应。
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    // SSE 已开始后不能再发送 JSON 错误响应，只关闭当前流。
    if (response.sent || response.raw.headersSent) {
      if (!response.raw.writableEnded) response.raw.end();
      return;
    }
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : "服务器内部错误",
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    response.code(status).send({ message: exceptionMessage(exception) });
  }
}
