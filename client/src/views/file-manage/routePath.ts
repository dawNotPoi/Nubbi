import type { FileBreadcrumb } from "@/api/file";

export type CrumbItem = { id: string; name: string };

const normalizeName = (name: string) => name.trim() || "未命名文件夹";

export const buildCrumbSegment = ({ id, name }: CrumbItem) =>
  `${id}-${encodeURIComponent(normalizeName(name))}`;

export const parseCrumbSegment = (segment: string): CrumbItem => {
  const separatorIndex = segment.indexOf("-");
  const id = separatorIndex < 0 ? segment : segment.slice(0, separatorIndex);
  const encodedName = separatorIndex < 0 ? "" : segment.slice(separatorIndex + 1);
  try {
    return { id, name: decodeURIComponent(encodedName) || id };
  } catch {
    return { id, name: encodedName || id };
  }
};

export const parseSplatToCrumbs = (splat: string) =>
  splat.split("/").filter(Boolean).map(parseCrumbSegment);

export const getFolderIdFromSplat = (splat: string) =>
  parseSplatToCrumbs(splat).at(-1)?.id;

export const buildFilePath = (crumbs: CrumbItem[]) => {
  const path = crumbs.map(buildCrumbSegment).join("/");
  return path ? `/file/${path}` : "/file";
};

export const toRouteCrumbs = (breadcrumbs: FileBreadcrumb[]) =>
  breadcrumbs.flatMap((item) =>
    item._id ? [{ id: item._id, name: item.name }] : [],
  );
