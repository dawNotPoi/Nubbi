"use client";

import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { useState, type ComponentProps, type ReactElement } from "react";

/**
 * 等待导航时保持固定尺寸的反馈，避免点击后像没有响应。
 * @returns 延迟出现的导航状态图标。
 */
function NavigationHint(): ReactElement {
  const { pending } = useLinkStatus();
  return (
    <span className="navigation-hint" data-pending={pending} role="status">
      <LoaderCircle size={14} aria-hidden="true" />
      {pending && <span className="sr-only">正在打开文章…</span>}
    </span>
  );
}

/**
 * 只在鼠标或键盘表达阅读意图时预取 Next 路由壳，节省列表初始带宽。
 * @param props 原生链接属性，href 必须为站内路径。
 * @returns 带导航反馈、保留原生新标签操作的文章链接。
 */
export function IntentLink({
  children,
  ...props
}: ComponentProps<"a"> & { href: string }): ReactElement {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(event) => {
        props.onMouseEnter?.(event);
        setActive(true);
      }}
      onFocus={(event) => {
        props.onFocus?.(event);
        setActive(true);
      }}
    >
      {children}
      <NavigationHint />
    </Link>
  );
}
