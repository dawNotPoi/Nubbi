import { Extension } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
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
            if (html) {
              // Skip if the HTML has meaningful structure beyond wrapping plain text.
              // Simple wrappers (e.g. <html><body><p>text</body></html>) are trivial.
              const hasStructure = /<(h[1-6]|li|table|a|img|blockquote|code|pre|strong|em)\b/i.test(html);
              if (hasStructure) return false;
            }

            if (text.length < 3) return false;

            try {
              const json = this.editor.markdown?.parse(text);
              if (!json?.content?.length) return false;

              const { state, dispatch } = view;
              const { selection } = state;
              const nodes = json.content.map((item) =>
                state.schema.nodeFromJSON(item),
              );
              const fragment = Fragment.fromArray(nodes);
              let tr = state.tr.replaceWith(
                selection.from,
                selection.to,
                fragment,
              );
              const endPos = selection.from + fragment.content.size;
              tr = tr.setSelection(
                state.selection.constructor.near(tr.doc.resolve(endPos)),
              );
              dispatch(tr);
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
