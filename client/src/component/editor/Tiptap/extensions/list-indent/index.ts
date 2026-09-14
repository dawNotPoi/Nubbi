import { Extension } from "@tiptap/core";

export const ListIndentExtension = Extension.create({
  name: "listIndent",

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          return false;
        }

        if (editor.isActive("listItem")) {
          return editor.commands.sinkListItem("listItem");
        }

        return false;
      },
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("codeBlock")) {
          return false;
        }

        if (editor.isActive("listItem")) {
          return editor.commands.liftListItem("listItem");
        }

        return false;
      },
    };
  },
});
