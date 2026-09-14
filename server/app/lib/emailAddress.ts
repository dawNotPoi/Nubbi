/** 基础邮箱格式正则 */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 常见邮箱域名拼写错误的纠正映射 */
const emailDomainCorrections: Record<string, string> = {
  "foxmai.com": "foxmail.com",
  "gamil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "qq.con": "qq.com",
};

/** 取邮箱域名的小写形式 */
const getEmailDomainCorrection = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? emailDomainCorrections[domain] : undefined;
};

/** 校验邮箱格式，返回错误提示或 null（格式合法） */
export const validateEmailAddress = (email: string): string | null => {
  if (!emailPattern.test(email)) {
    return "请输入有效的邮箱地址";
  }

  const correctedDomain = getEmailDomainCorrection(email);
  if (correctedDomain) {
    return `邮箱域名是否应为 ${correctedDomain}？`;
  }

  return null;
};
