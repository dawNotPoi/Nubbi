const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailDomainCorrections: Record<string, string> = {
  "foxmai.com": "foxmail.com",
  "gamil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "qq.con": "qq.com",
};

const getEmailDomainCorrection = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? emailDomainCorrections[domain] : undefined;
};

export const validateEmailAddress = (email: string) => {
  if (!emailPattern.test(email)) {
    return "请输入有效的邮箱地址";
  }

  const correctedDomain = getEmailDomainCorrection(email);
  if (correctedDomain) {
    return `邮箱域名是否应为 ${correctedDomain}？`;
  }

  return null;
};
