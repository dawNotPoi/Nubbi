"use client";

import { FloatingPortal } from "@floating-ui/react";
import { ScanEye } from "lucide-react";
import { useId, type ReactElement, type ReactNode } from "react";
import type { LinkTarget } from "../links/model";
import { useLinkPopover } from "../hooks/use-link-popover";
import { IntentLink } from "./intent-link";
import { LinkIdentity } from "./link-identity";
import { LinkPreviewContent } from "./link-preview-content";

/**
 * 行内链接保留直接导航，额外提供鼠标、键盘和触屏可用的摘要预览。
 * @param props 链接目标、原有富文本和可访问名称。
 * @returns 站点标识、正文链接与按需挂载的浮层。
 */
export function RichLink({
  target,
  children,
  label,
}: {
  target: LinkTarget;
  children: ReactNode;
  label: string;
}): ReactElement {
  const {
    setAnchor,
    setLayer,
    floatingStyles,
    open,
    setOpen,
    getReferenceProps,
    getFloatingProps,
  } = useLinkPopover();
  const id = useId();
  const Anchor = target.kind === "internal" ? IntentLink : "a";
  return (
    <span className="rich-link" ref={setAnchor} {...getReferenceProps()}>
      <Anchor
        className="rich-link-anchor"
        href={target.href}
        target={target.kind === "external" ? "_blank" : undefined}
        rel={target.kind === "external" ? "noopener noreferrer" : undefined}
        aria-describedby={open ? id : undefined}
      >
        <LinkIdentity source={target.source} />
        <span>{children}</span>
      </Anchor>
      <button
        type="button"
        className="link-preview-trigger"
        aria-label={`预览链接：${label || target.label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <ScanEye size={14} aria-hidden="true" />
      </button>
      {open && (
        <FloatingPortal>
          <span
            ref={setLayer}
            style={floatingStyles}
            className="link-popover"
            {...getFloatingProps()}
            id={id}
          >
            <LinkPreviewContent target={target} label={label} />
          </span>
        </FloatingPortal>
      )}
    </span>
  );
}
