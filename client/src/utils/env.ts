const getEnvValue = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const trimTrailingSlash = (value: string) => {
  return value.replace(/\/+$/, "");
};

const getCurrentOrigin = () => {
  return typeof window === "undefined" ? "" : window.location.origin;
};

export const getApiBaseUrl = () => {
  const apiUrl = getEnvValue(import.meta.env.VITE_API_URL);
  return trimTrailingSlash(apiUrl || getCurrentOrigin());
};

export const getAuthBaseUrl = () => {
  const authUrl = getEnvValue(import.meta.env.VITE_AUTH_URL);
  if (authUrl) return trimTrailingSlash(authUrl);

  return getApiBaseUrl();
};

export const getSocketBaseUrl = () => {
  const socketUrl = getEnvValue(import.meta.env.VITE_SOCKET_URL);
  return trimTrailingSlash(socketUrl || getCurrentOrigin());
};
