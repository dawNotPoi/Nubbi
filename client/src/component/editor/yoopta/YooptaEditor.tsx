import ActionMenuList, {
  DefaultActionMenuRender,
} from "@yoopta/action-menu-list";
import Code from "@yoopta/code";
import YooptaEditor, {
  createYooptaEditor,
  YooptaContentValue,
} from "@yoopta/editor";
import Embed from "@yoopta/embed";
import { markdown } from "@yoopta/exports";
import File from "@yoopta/file";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Image from "@yoopta/image";
import Link from "@yoopta/link";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import {
  Bold,
  CodeMark,
  Highlight,
  Italic,
  Strike,
  Underline,
} from "@yoopta/marks";
import Paragraph from "@yoopta/paragraph";
import Table from "@yoopta/table";

import { useEffect, useMemo, useRef, useState } from "react";
import { imgToGitCloud } from "../../../api/file";
const plugins = [
  Paragraph,
  Image.extend({
    options: {
      async onUpload(file) {
        const res = await imgToGitCloud(file);
        return {
          src: res,
          alt: file.name,
          sizes: {
            width: 500,
            height: 500,
          },
        };
      },
    },
  }),
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  Code,
  NumberedList,
  BulletedList,
  TodoList,
  Embed,
  Link,
  File,
  Table,
];
const marks = [Bold, Italic, CodeMark, Underline, Strike, Highlight];
const TOOLS = {
  ActoinMenu: {
    render: DefaultActionMenuRender,
    tool: ActionMenuList,
  },
};

export default function CustomEditor({
  defaultValue,
  // editor,
  onChange,
}: {
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const editor = useMemo(() => createYooptaEditor(), []);
  const [value, setValue] = useState<YooptaContentValue>();
  const deserializeMarkdown = (markdownString: string) => {
    const value = markdown.deserialize(editor, markdownString);
    setValue(value);
  };
  useEffect(() => {
    deserializeMarkdown(defaultValue || "");
  }, [defaultValue]);
  const onChangeHandler = () => {
    onChange?.(markdown.serialize(editor, editor.getEditorValue()));
  };

  const selectionRef = useRef(null);

  return (
    <div className="min-h-[500px]   py-2 box-border" ref={selectionRef}>
      <YooptaEditor
        key={value}
        width={"100%"}
        editor={editor}
        placeholder="Write,press '/' for commands"
        value={value}
        onChange={onChangeHandler}
        marks={marks}
        selectionBoxRoot={selectionRef}
        autoFocus
        custome
        tools={TOOLS}
        plugins={plugins}
      />
    </div>
  );
}
