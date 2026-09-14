import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

type HeaderRequest = {
  headers: Record<string, string | string[] | undefined>;
};

/**
 * 从可能为数组的请求头值中取出第一个值。
 * @param value 请求头原始值，可能为字符串、数组或 undefined。
 * @returns 第一个值；为空时返回空字符串。
 */
const firstHeader = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

/**
 * 使用恒定时间比较令牌，避免时序侧信道攻击。
 * @param provided 请求中提供的令牌。
 * @param expected 期望的令牌。
 * @returns 两者长度一致且内容相同返回 true。
 */
const matchesToken = (provided: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};

/**
 * 保护模型和 MCP 配置接口。
 * Guard 在进入 Controller 前执行，因此 Controller 不需要重复处理管理密钥。
 */
@Injectable()
export class ConfigAccessGuard implements CanActivate {
  /**
   * 校验请求携带的管理密钥。
   * @param context Nest 执行上下文。
   * @returns 校验通过返回 true；未配置或密钥错误时抛异常。
   */
  canActivate(context: ExecutionContext): boolean {
    const expected = env.CONFIG_ADMIN_TOKEN ?? env.MCP_CONFIG_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException(
        "请先在 assistant/.env 中配置 CONFIG_ADMIN_TOKEN 并重启 Assistant API",
      );
    }
    const request = context.switchToHttp().getRequest<HeaderRequest>();
    const provided = firstHeader(request.headers["x-config-token"])
      || firstHeader(request.headers["x-mcp-config-token"]);
    if (!matchesToken(provided, expected)) {
      throw new UnauthorizedException("设置管理密钥无效");
    }
    return true;
  }
}
