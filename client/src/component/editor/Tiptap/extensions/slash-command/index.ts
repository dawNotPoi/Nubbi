// SlashCommandExtension.js
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import tippy from "tippy.js";
import SuggestionList from "./SuggestionList";
import { getSuggestions } from "./suggestions";

/**
 * Tiptap Suggestion 的配置对象
 */
const suggestion: Omit<SuggestionOptions, "editor"> = {
  // 触发字符
  char: "/",
  decorationClass: "dn-editor__slash-command-match",
  decorationEmptyClass: "dn-editor__slash-command-match--empty",
  // 核心函数：获取建议项
  items: getSuggestions,
  // 渲染函数：用于创建和管理 React 组件 (Menu UI)
  render: () => {
    let component: any; // 存储 ReactRenderer 实例
    let popup: any; // 存储 tippy 实例
    let cleanupTimer: number | undefined;

    const clearPendingCleanup = () => {
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
        cleanupTimer = undefined;
      }
    };

    const hasActiveSuggestion = (editor: any) =>
      Boolean(editor.view.dom.querySelector(".dn-editor__slash-command-match"));

    const destroyPopup = () => {
      popup?.[0]?.destroy();
      component?.destroy();
      popup = null;
      component = null;
    };

    const getPlacement = (props: any): "top-start" | "bottom-start" => {
      const rect = props.clientRect?.();
      if (!rect) {
        return "bottom-start";
      }

      const viewportPadding = 12;
      const itemCount = props.items?.length ?? 0;
      const menuHeight = Math.min(408, itemCount > 0 ? itemCount * 44 + 4 : 40);
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;

      return spaceBelow < menuHeight && spaceAbove > spaceBelow
        ? "top-start"
        : "bottom-start";
    };

    const ensureComponent = (props: any) => {
      if (component) {
        component.updateProps(props);
        return;
      }

      component = new ReactRenderer(SuggestionList, {
        props,
        editor: props.editor,
      });
    };

    const ensurePopup = (props: any) => {
      if (!props.clientRect || !component) {
        return;
      }

      if (popup?.[0]) {
        popup[0].setProps({
          content: component.element,
          getReferenceClientRect: props.clientRect,
          placement: getPlacement(props),
        });
        popup[0].show();
        return;
      }

      popup = tippy("body", {
        arrow: false,
        appendTo: () => document.body,
        content: component.element,
        getReferenceClientRect: props.clientRect,
        hideOnClick: false,
        interactive: true,
        interactiveBorder: 8,
        placement: getPlacement(props),
        popperOptions: {
          strategy: "fixed",
          modifiers: [
            {
              name: "flip",
              options: {
                fallbackPlacements: ["top-start", "bottom-start"],
                padding: 12,
              },
            },
            {
              name: "preventOverflow",
              options: {
                altAxis: true,
                boundary: "viewport",
                padding: 12,
              },
            },
          ],
        },
        showOnCreate: true,
        theme: "slash-command",
        trigger: "manual",
      });
    };

    return {
      onStart: (props) => {
        clearPendingCleanup();
        ensureComponent(props);
        ensurePopup(props);
      },

      onUpdate(props) {
        clearPendingCleanup();
        ensureComponent(props);
        ensurePopup(props);
      },

      onKeyDown(props) {
        // 将键盘事件传递给 SuggestionList 组件处理
        if (component.ref?.onKeyDown(props)) {
          return true;
        }

        // 如果用户按了 ESC 键，隐藏菜单
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }

        return false;
      },

      onExit(props) {
        clearPendingCleanup();
        cleanupTimer = window.setTimeout(() => {
          cleanupTimer = undefined;
          if (hasActiveSuggestion(props.editor)) {
            return;
          }

          destroyPopup();
        }, 80);
      },
    };
  },
};

// 导出 Tiptap 扩展
export const SlashCommandExtension = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestion, // 传入 Suggestion 配置
      }),
    ];
  },
});
