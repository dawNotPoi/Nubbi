import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const PasteMarkdownExtension = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteMarkdown"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;

            const html = event.clipboardData?.getData("text/html");
            if (html) return false;

            if (text.length < 3) return false;

            try {
              const json = this.editor.markdown?.parse(text);
              if (!json?.content?.length) return false;

              const { state, dispatch } = view;
              const nodes = json.content.map((item) =>
                state.schema.nodeFromJSON(item),
              );
              const fragment = Fragment.fromArray(nodes);
              dispatch(
                state.tr.replaceSelection(Slice.maxOpen(fragment)),
              );
              return true;
            } catch {
              return false;
            }
          },
        },
      }),
    ];
  },
});
