import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** 让语义圆角与旧圆角工具类互斥，保留调用方覆盖基础组件的能力。 */
const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["compact", "control", "panel", "sheet"],
    },
  },
})

/**
 * 合并条件类名并消除相互冲突的 Tailwind 工具类。
 * @param inputs 普通类名和条件类名集合。
 * @returns 按调用顺序完成覆盖后的类名。
 */
export function cn(...inputs: ClassValue[]): string {
  return mergeClasses(clsx(inputs))
}
