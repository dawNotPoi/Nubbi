const getEnvValue = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const getCurrentOrigin = () => {
  return typeof window === "undefined" ? "" : window.location.origin;
};

export const getApiBaseUrl = () => {
  return getEnvValue(import.meta.env.VITE_API_URL) || getCurrentOrigin();
};

export const getSocketBaseUrl = () => {
  return getEnvValue(import.meta.env.VITE_SOCKET_URL) || getCurrentOrigin();
};
