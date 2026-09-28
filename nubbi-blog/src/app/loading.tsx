import type { ReactElement } from "react";
import { CollectionLoading } from "@/features/blog/components/page-loading";

/**
 * 导航等待时保留文章行结构，降低布局跳动。
 * @returns 可供屏幕阅读器识别的加载占位。
 */
export default function Loading(): ReactElement {
  return <CollectionLoading />;
}
