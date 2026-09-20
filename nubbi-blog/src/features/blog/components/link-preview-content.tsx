"use client";

import type { ReactElement } from "react";
import { previewTitle, type LinkTarget } from "../links/model";
import { useLinkPreview } from "../hooks/use-link-preview";
import { LinkIdentity } from "./link-identity";

/**
 * 浮层打开时才挂载，确保站内文章每次预览重新校验公开状态。
 * @param props 当前链接及作者提供的标题。
 * @returns 非交互式摘要，读者仍通过原链接导航。
 */
export function LinkPreviewContent({
  target,
  label,
}: {
  target: LinkTarget;
  label: string;
}): ReactElement {
  const { data, loading } = useLinkPreview(target, true);
  return (
    <>
      <span className="preview-source">
        <LinkIdentity source={target.source} />
        {data?.siteName || target.host}
      </span>
      <strong className="preview-title">
        {previewTitle(target, data?.title, label)}
      </strong>
      <span className="preview-description" aria-live="polite">
        {loading
          ? "正在读取摘要…"
          : data?.available
            ? data.description || "打开链接阅读完整内容。"
            : "暂时无法获取摘要，可直接打开原链接。"}
      </span>
      <span className="preview-address">{target.url}</span>
    </>
  );
}
