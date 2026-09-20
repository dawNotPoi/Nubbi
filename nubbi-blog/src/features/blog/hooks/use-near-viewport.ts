"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * 提前少量距离加载链接摘要，只观察一次并及时释放观察器。
 * @returns 卡片引用与是否接近阅读视口。
 */
export function useNearViewport(): {
  ref: RefObject<HTMLDivElement | null>;
  visible: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}
