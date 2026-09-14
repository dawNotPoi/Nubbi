import { Editor } from "@tiptap/core";
import { SuggestionKeyDownProps } from "@tiptap/suggestion";
import clsx from "clsx";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

// 1. 单个命令项的类型
export interface SuggestionItem {
  title: string;
  icon?: React.ReactNode;
  // 这里的 props 包含 editor, range (虽然你现在不需要删除 range，但保留以备不时之需)
  command: (props: { editor: Editor; range: Range }) => void;
}

// 2. 传递给 SuggestionList 组件的 Props
export interface SuggestionListProps {
  items: SuggestionItem[];
  editor: Editor;
  range: Range;
  query: string;
}

// 3. 暴露给外部（如 Suggestion 插件）调用的句柄类型
export interface SuggestionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    // 当建议列表更新时（例如用户输入了更多字符），重置选中项到第一个
    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    // --- 命令选择和执行 ---
    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        item.command(props);
      }
    };

    // --- 键盘事件处理函数 ---
    const upHandler = () => {
      setSelectedIndex(
        (prevIndex) => (prevIndex + props.items.length - 1) % props.items.length
      );
    };

    const downHandler = () => {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    // 使用 useImperativeHandle 将键盘处理函数暴露给 Tiptap 渲染器
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (!props.items || props.items.length === 0) {
      return <div>No Content</div>;
    }

    return (
      <div className="flex-col gap-2">
        {props.items.map((item, index: number) => (
          <div
            key={index}
            className={clsx(
              selectedIndex === index && "bg-gray-100",
              "hover:bg-gray-100 cursor-pointer overflow-y-auto py-1 px-2 flex gap-1"
            )}
            onClick={() => selectItem(index)}
          >
            <div className="size-10 bg-white flex items-center justify-center  border rounded-md">
              {item.icon}
            </div>
            <div className="flex items-center">{item.title}</div>
          </div>
        ))}
      </div>
    );
  }
);

export default SuggestionList;
