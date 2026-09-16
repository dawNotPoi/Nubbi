"use client";

import { ArrowUpRight } from "lucide-react";
import type { ReactElement } from "react";
import { previewTitle, type LinkTarget } from "../links/model";
import { useNearViewport } from "../hooks/use-near-viewport";
import { useLinkPreview } from "../hooks/use-link-preview";
import { IntentLink } from "./intent-link";
import { LinkIdentity } from "./link-identity";

/**
 * 单段链接先展示可点击的稳定卡片，接近视口后补齐标题与摘要。
 * @param props 归一化目标和作者写下的链接文字。
 * @returns 不阻塞正文且失败时仍可打开的链接卡片。
 */
export function LinkCard({
  target,
  label,
}: {
  target: LinkTarget;
  label: string;
}): ReactElement {
  const { ref, visible } = useNearViewport();
  const { data, loading } = useLinkPreview(target, visible);
  const Anchor = target.kind === "internal" ? IntentLink : "a";
  const customLabel =
    label !== target.url &&
    label !== target.href &&
    !/^https?:\/\//i.test(label);
  const stableTitle =
    customLabel ||
    target.source === "npm" ||
    (target.source === "github" &&
      /^\/[^/]+\/[^/]+\/?$/.test(new URL(target.url).pathname));
  return (
    <div ref={ref} className="link-card-wrapper">
      <Anchor
        className="link-card"
        data-fixed-title={stableTitle}
        href={target.href}
        target={target.kind === "external" ? "_blank" : undefined}
        rel={target.kind === "external" ? "noopener noreferrer" : undefined}
      >
        <span className="link-card-icon">
          <LinkIdentity source={target.source} size={24} />
        </span>
        <span className="link-card-content">
          <span className="preview-source">
            {data?.siteName ||
              (target.source === "github"
                ? "GitHub"
                : target.source === "npm"
                  ? "npm"
                  : target.host)}
          </span>
          <strong className="preview-title">
            {customLabel ? label : previewTitle(target, data?.title)}
          </strong>
          <span className="preview-description" aria-live="polite">
            {loading
              ? "正在读取摘要…"
              : data?.available
                ? data.description || "打开链接阅读完整内容。"
                : "打开链接，阅读更多内容。"}
          </span>
          <span className="preview-address">
            {target.host}
            {new URL(target.url).pathname.replace(/\/$/, "")}
          </span>
        </span>
        <ArrowUpRight
          className="link-card-arrow"
          size={18}
          aria-hidden="true"
        />
      </Anchor>
    </div>
  );
}
