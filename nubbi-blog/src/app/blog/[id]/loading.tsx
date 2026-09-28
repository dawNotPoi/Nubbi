import type { ReactElement } from "react";
import { ReadingLoading } from "@/features/blog/components/page-loading";

/**
 * 文章切换时保持窄阅读栏的尺寸。
 * @returns 正文加载占位。
 */
export default function ArticleLoading(): ReactElement {
  return <ReadingLoading />;
}
