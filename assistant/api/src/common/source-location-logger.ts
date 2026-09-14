import { ConsoleLogger, type LogLevel } from "@nestjs/common";
import path from "node:path";
import { fileURLToPath } from "node:url";

const loggerFilePath = fileURLToPath(import.meta.url);
const STACK_FRAME_PATTERN =
  /^\s*at (?:.* \()?((?:file:\/\/\/|[A-Za-z]:[\\/]|\/).+):(\d+):(\d+)\)?$/;
const NEST_LOGGER_PATTERN =
  /\/node_modules\/.*\/(?:console-logger|logger)\.service\.js$/;

/**
 * 获取日志调用位置；只跳过日志包装层，不将框架内部日志归因到更上层的业务调用。
 * @returns 可被终端识别的绝对路径、行号和列号；无业务调用位置时返回 undefined。
 */
const readLogSourceLocation = (): string | undefined => {
  const previousStackTraceLimit = Error.stackTraceLimit;
  try {
    // Nest 静态方法及实例方法都带包装层，临时提高深度，并在同步捕获后立即恢复。
    Error.stackTraceLimit = Math.max(previousStackTraceLimit, 40);
    const stackHolder: { stack?: string } = {};
    Error.captureStackTrace(stackHolder, readLogSourceLocation);
    for (const frame of stackHolder.stack?.split("\n") ?? []) {
      const match = STACK_FRAME_PATTERN.exec(frame);
      if (!match) continue;
      const [, source, line, column] = match;
      if (!source || !line || !column) continue;
      const sourcePath = source.startsWith("file:")
        ? fileURLToPath(source)
        : source;
      const normalizedPath = sourcePath.replaceAll("\\", "/");
      if (
        path.normalize(sourcePath) === loggerFilePath ||
        NEST_LOGGER_PATTERN.test(normalizedPath)
      )
        continue;
      if (normalizedPath.includes("/node_modules/")) return undefined;
      return `${sourcePath}:${line}:${column}`;
    }
    return undefined;
  } catch {
    // 日志定位失败不能影响业务执行或原有日志输出。
    return undefined;
  } finally {
    Error.stackTraceLimit = previousStackTraceLimit;
  }
};

/** 保留 Nest 日志格式与异常堆栈，按配置为本地代码日志附加终端源码链接。 */
export class SourceLocationLogger extends ConsoleLogger {
  /**
   * 注入开发环境开关，不在日志基础设施中读取环境变量。
   * @param includeSourceLocation 是否采集日志调用位置。
   * @returns 日志实例。
   */
  public constructor(private readonly includeSourceLocation: boolean) {
    super();
  }

  /**
   * 输出原始消息后附加一次调用位置，不改变对象格式化、日志级别或错误堆栈。
   * @param messages Nest 已解析的日志消息。
   * @param context 模块上下文。
   * @param logLevel 日志级别。
   * @param writeStreamType 原日志使用的输出流。
   * @param errorStack 原始错误堆栈。
   * @returns 无返回值。
   */
  protected override printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: "stdout" | "stderr",
    errorStack?: unknown,
  ): void {
    const sourceLocation = this.includeSourceLocation
      ? readLogSourceLocation()
      : undefined;
    super.printMessages(
      messages,
      context,
      logLevel,
      writeStreamType,
      errorStack,
    );
    if (sourceLocation && messages.length > 0) {
      process[writeStreamType ?? "stdout"].write(`    at ${sourceLocation}\n`);
    }
  }
}
