"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ComponentPropsWithoutRef, type ReactElement } from "react";

type AnchorProps = ComponentPropsWithoutRef<"a"> & { href: string };

/**
 * 用完整路径替换旧 hash，并保留列表来源等查询参数。
 * @param props 本页锚点和链接属性。
 * @returns 由路由器维护历史的锚点链接。
 */
function ResolvedAnchor({ href, ...props }: AnchorProps): ReactElement {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <Link {...props} href={`${pathname}${search ? `?${search}` : ""}${href}`} prefetch={false} />;
}

/**
 * 首次静态输出保留可用锚点，水合后补齐路由状态。
 * @param props 本页锚点和原生链接属性。
 * @returns 兼容静态边界的站内锚点。
 */
export function AnchorLink(props: AnchorProps): ReactElement {
  return <Suspense fallback={<a {...props} />}><ResolvedAnchor {...props} /></Suspense>;
}
