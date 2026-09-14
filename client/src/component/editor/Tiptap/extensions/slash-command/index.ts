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
  // 核心函数：获取建议项
  items: getSuggestions,
  // 渲染函数：用于创建和管理 React 组件 (Menu UI)
  render: () => {
    let component: any; // 存储 ReactRenderer 实例
    let popup: any; // 存储 tippy 实例
    return {
      onStart: (props) => {
        // 1. 创建 React 组件的渲染器
        component = new ReactRenderer(SuggestionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }
        // @ts-ignore
        popup = tippy("body", {
          arrow: false,
          getReferenceClientRect: props.clientRect, // 定位菜单的参考位置（光标位置）
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          theme: "light",
        });
      },

      onUpdate(props) {
        // 1. 更新 React 组件的 props (items 列表变化)
        component.updateProps(props);
        // 2. 更新 tippy 的位置
        if (!props.clientRect) {
          return;
        }
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
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

      onExit() {
        // 清理 tippy 实例和 React 组件
        popup && popup[0].destroy();
        component && component.destroy();
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
