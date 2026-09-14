import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

type HeaderRequest = {
  headers: Record<string, string | string[] | undefined>;
};

const firstHeader = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

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
