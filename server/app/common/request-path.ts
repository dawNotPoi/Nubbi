const redactPathSecrets = (pathname: string): string =>
  pathname.replace(
    /(\/reset-password\/)[^/]+/gi,
    "$1[REDACTED]",
  );

export const getSafeRequestPath = (
  originalUrl: string,
  fallbackPath = "/",
): string => {
  const pathname = originalUrl.split("?")[0] || fallbackPath;
  return redactPathSecrets(pathname);
};
