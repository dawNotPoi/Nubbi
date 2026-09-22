const AUTH_ERROR_TEXT: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "邮箱或密码不正确，请重试",
  INVALID_PASSWORD: "密码不正确，请重试",
  USER_NOT_FOUND: "邮箱或密码不正确，请重试",
  EMAIL_NOT_VERIFIED: "请先验证邮箱后再登录",
  INVALID_EMAIL: "请输入有效的邮箱地址",
  USER_ALREADY_EXISTS: "该邮箱已注册，请直接登录",
  INVALID_OTP: "验证码不正确，请重新输入",
  OTP_EXPIRED: "验证码已过期，请重新获取",
  TOO_MANY_REQUESTS: "操作太频繁，请稍后重试",
  RATE_LIMIT_EXCEEDED: "操作太频繁，请稍后重试",
  SESSION_EXPIRED: "登录状态已过期，请重新登录",
  SERVICE_UNAVAILABLE: "登录服务暂时不可用，请稍后重试",
};

/**
 * 将已知认证错误码转成中文，保留服务端中文说明但不直接展示英文技术错误。
 * @param error 认证服务返回的错误对象。
 * @param fallback 当前操作的中文兜底文案。
 * @returns 面向用户的中文错误说明。
 */
export function getAuthErrorText(error: { code?: string; message?: string } | null | undefined, fallback: string): string {
  const known = error?.code ? AUTH_ERROR_TEXT[error.code] : undefined;
  return known || (error?.message && /[\u4e00-\u9fff]/.test(error.message) ? error.message : fallback);
}
