# 重新设计 HeadingTOC — Notion 竖线迷你地图风格

## 背景

当前实现用 `absolute` 定位，hover 展开文字条目。用户要的是：

- `fixed` 定位，滚动跟随
- 未 hover：细竖线指示条（每个 heading 一节），当前段落高亮
- hover：展开显示标题文字

类似 Notion 右侧的竖线迷你目录。

## 修复

**文件**: `HeadingTOC.tsx`

完全重写 UI 层：

1. 容器 `fixed right-[calc(50%-600px/2-48px)]` 或在 note-editor-shell 右侧计算
2. 默认状态：一组垂直排列的细横线/短竖线，表示每个标题位置；当前段落对应线高亮（填充色）
3. hover 时：从竖线右侧滑出文字面板
4. 去掉 `useMemo` 未使用的 import

## 实现细节

```tsx
<div className="fixed right-[max(24px,calc((100vw-600px)/2-40px))] top-[180px] z-30">
  <div className="group/toc">
    {/* 默认：竖线条指示器 */}
    <div className="flex flex-col items-end gap-[3px]">
      {headings.map((h, i) => (
        <div
          key={i}
          className={`h-[3px] rounded-full transition-all duration-200 ${
            activeId === i
              ? "w-5 bg-neutral-800"
              : "w-3 bg-neutral-300"
          }`}
          style={{ width: activeId === i ? 20 : h.level === 1 ? 14 : h.level === 2 ? 10 : 6 }}
        />
      ))}
    </div>

    {/* hover 展开文字面板 */}
    <div className="pointer-events-none absolute right-0 top-0 opacity-0 transition-opacity duration-150 group-hover/toc:pointer-events-auto group-hover/toc:opacity-100">
      <div className="w-48 rounded-xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur">
        <nav className="max-h-[50vh] overflow-y-auto">
          {headings.map((h, i) => (...))}
        </nav>
      </div>
    </div>
  </div>
</div>
```

计算 `right` 位置：基于 note-editor-shell 宽度 50% / min-width 600px 居中，(100vw - 600px) / 2 - 固定偏移。

## 验证

1. 打开有标题的笔记 → 右侧显示竖线条
2. 滚动文档 → 当前区域对应的线条高亮加粗
3. hover → 展开文字面板
4. 点击标题 → 跳转
