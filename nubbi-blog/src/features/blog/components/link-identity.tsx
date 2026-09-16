import { BookOpen, GitFork, Globe2, Package } from "lucide-react";
import type { ReactElement } from "react";
import type { LinkTarget } from "../links/model";

/**
 * 本地图标标识链接来源，不为每条行内链接提前请求第三方图标。
 * @param props 已识别的来源和图标尺寸。
 * @returns 跟随统一主题的站点标识。
 */
export function LinkIdentity({
  source,
  size = 16,
}: {
  source: LinkTarget["source"];
  size?: number;
}): ReactElement {
  const Icon = { github: GitFork, npm: Package, blog: BookOpen, web: Globe2 }[
    source
  ];
  return <Icon size={size} aria-hidden="true" />;
}
