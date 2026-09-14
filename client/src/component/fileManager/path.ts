export function normalizePathLikeName(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function splitPathParts(value: string) {
  const normalized = normalizePathLikeName(value);
  if (!normalized) return [];
  return normalized.split("/").filter(Boolean);
}

export function joinPathParts(parts: string[]) {
  return parts.filter(Boolean).join("/");
}

export function isPrefixPath(prefixParts: string[], fullParts: string[]) {
  if (prefixParts.length > fullParts.length) return false;
  for (let i = 0; i < prefixParts.length; i++) {
    if (prefixParts[i] !== fullParts[i]) return false;
  }
  return true;
}
