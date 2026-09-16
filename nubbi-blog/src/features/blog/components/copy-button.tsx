"use client";

import { Check, Copy } from "lucide-react";
import type { ReactElement } from "react";
import { useClipboard } from "../hooks/use-clipboard";

/**
 * 通过可访问的文字反馈复制结果，不依赖弹窗或悬浮提示。
 * @param props 待复制内容与按钮的默认标签。
 * @returns 可复用复制按钮。
 */
export function CopyButton({
  text,
  label = "复制代码",
}: {
  text: string;
  label?: string;
}): ReactElement {
  const { status, copy } = useClipboard();
  return (
    <button
      className="copy-button"
      type="button"
      onClick={() => void copy(text)}
    >
      {status === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      <span aria-live="polite">
        {status === "copied"
          ? "已复制"
          : status === "failed"
            ? "复制失败，请手动复制"
            : label}
      </span>
    </button>
  );
}
