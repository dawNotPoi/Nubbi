"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useState, type ReactElement } from "react";
import { ImageOff, Maximize2, X } from "lucide-react";
import { useImagePreview } from "../hooks/use-image-preview";

/**
 * 配图使用稳定占位与懒加载，放大时才挂载对话框，失败时保留说明。
 * @param props 已检查的配图地址与说明。
 * @returns 可放大的正文配图及原生预览对话框。
 */
export function ArticleImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const { open, dialog: dialogRef, show, close, dismiss } = useImagePreview();
  if (failed)
    return (
      <span className="image-fallback">
        <ImageOff size={20} aria-hidden="true" />
        {alt || "图片暂时无法显示"}
      </span>
    );
  return (
    <span className="article-image-frame">
      <button
        type="button"
        className="article-image-button"
        onClick={show}
        aria-label={`放大图片：${alt || "文章配图"}`}
      >
        <Image
          src={src}
          alt={alt}
          width={960}
          height={640}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
        <span className="image-zoom-hint">
          <Maximize2 size={16} aria-hidden="true" />
        </span>
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="image-lightbox"
            aria-label={alt || "文章配图预览"}
            onClose={dismiss}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={close}
              aria-label="关闭图片预览"
            >
              <X size={22} aria-hidden="true" />
            </button>
            <figure>
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={1200}
                unoptimized
                loading="eager"
                referrerPolicy="no-referrer"
              />
              {alt && <figcaption>{alt}</figcaption>}
            </figure>
          </dialog>,
          document.body,
        )}
    </span>
  );
}
