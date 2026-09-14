export type CrumbItem = {
  id: string;
  name: string;
};

const BREADCRUMB_NAME_CACHE_KEY = "file-breadcrumb-name-cache";

const readBreadcrumbNameCache = () => {
  if (typeof window === "undefined") return new Map<string, string>();

  try {
    const raw = window.sessionStorage.getItem(BREADCRUMB_NAME_CACHE_KEY);
    if (!raw) return new Map<string, string>();

    const parsed = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map<string, string>();
  }
};

export const persistBreadcrumbNames = (crumbs: CrumbItem[]) => {
  if (typeof window === "undefined" || crumbs.length === 0) return;

  const nameMap = readBreadcrumbNameCache();
  crumbs.forEach((item) => {
    if (item.name && item.name !== item.id) {
      nameMap.set(item.id, item.name);
    }
  });

  try {
    window.sessionStorage.setItem(
      BREADCRUMB_NAME_CACHE_KEY,
      JSON.stringify(Object.fromEntries(nameMap)),
    );
  } catch {}
};

const normalizeCrumbName = (name: string) => name.trim() || "未命名文件夹";

const decodeSegmentName = (value?: string) => {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const buildCrumbSegment = ({ id, name }: CrumbItem) => {
  const safeName = encodeURIComponent(normalizeCrumbName(name));
  return `${id}-${safeName}`;
};

export const parseCrumbSegment = (segment: string): CrumbItem => {
  const separatorIndex = segment.indexOf("-");

  if (separatorIndex === -1) {
    return {
      id: segment,
      name: "",
    };
  }

  return {
    id: segment.slice(0, separatorIndex),
    name: decodeSegmentName(segment.slice(separatorIndex + 1)),
  };
};

export const buildFilePath = (crumbs: CrumbItem[]) => {
  const path = crumbs.map(buildCrumbSegment).join("/");
  return path ? `/file/${path}` : "/file";
};

export const parseSplatToCrumbs = (
  splat: string,
  knownCrumbs: CrumbItem[] = [],
) => {
  const knownNameMap = readBreadcrumbNameCache();
  knownCrumbs.forEach((item) => knownNameMap.set(item.id, item.name));

  return splat
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const parsed = parseCrumbSegment(segment);
      return {
        id: parsed.id,
        name: parsed.name || knownNameMap.get(parsed.id) || parsed.id,
      };
    });
};

export const isSameCrumbs = (a: CrumbItem[], b: CrumbItem[]) =>
  a.length === b.length &&
  a.every(
    (item, index) => item.id === b[index]?.id && item.name === b[index]?.name,
  );
