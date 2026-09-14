import { Extension } from "@tiptap/core";
import {
  AllSelection,
  EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";

type SmartSelectMode = "idle" | "block-selected" | "all-selected";

interface SmartSelectState {
  mode: SmartSelectMode;
  from: number | null;
  to: number | null;
  kind: "text" | "node" | null;
}

interface BlockSelectionTarget {
  selection: TextSelection | NodeSelection;
  mode: Extract<SmartSelectMode, "block-selected">;
  from: number;
  to: number;
  kind: "text" | "node";
}

const SMART_SELECT_ALL_KEY = new PluginKey<SmartSelectState>("smartSelectAll");

const IDLE_STATE: SmartSelectState = {
  mode: "idle",
  from: null,
  to: null,
  kind: null,
};

const BLOCK_PRIORITY_NAMES = new Set(["listItem", "codeBlock", "blockquote"]);

const isSameSelection = (state: SmartSelectState, from: number, to: number) => {
  return state.mode === "block-selected" && state.from === from && state.to === to;
};

const resolveBlockTarget = (
  editorState: EditorState,
): BlockSelectionTarget | null => {
  const { selection, doc } = editorState;

  if (selection instanceof NodeSelection && selection.node.isAtom) {
    return {
      selection,
      mode: "block-selected",
      from: selection.from,
      to: selection.to,
      kind: "node",
    };
  }

  const $from = selection.$from;
  let preferredTextRange: { from: number; to: number } | null = null;
  let preferredNodePos: number | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    const before = $from.before(depth);
    const start = $from.start(depth);
    const end = $from.end(depth);

    if (BLOCK_PRIORITY_NAMES.has(node.type.name)) {
      if (node.isTextblock || node.isBlock) {
        return {
          selection: TextSelection.create(doc, start, end),
          mode: "block-selected",
          from: start,
          to: end,
          kind: "text",
        };
      }
    }

    if (preferredNodePos === null && (node.isAtom || node.type.name === "image")) {
      preferredNodePos = before;
    }

    if (
      preferredTextRange === null &&
      node.isTextblock &&
      node.type.name !== "codeBlock"
    ) {
      preferredTextRange = {
        from: start,
        to: end,
      };
    }
  }

  if (preferredNodePos !== null) {
    const nodeSelection = NodeSelection.create(doc, preferredNodePos);
    return {
      selection: nodeSelection,
      mode: "block-selected",
      from: nodeSelection.from,
      to: nodeSelection.to,
      kind: "node",
    };
  }

  if (preferredTextRange) {
    return {
      selection: TextSelection.create(
        doc,
        preferredTextRange.from,
        preferredTextRange.to,
      ),
      mode: "block-selected",
      from: preferredTextRange.from,
      to: preferredTextRange.to,
      kind: "text",
    };
  }

  return null;
};

export const SmartSelectAllExtension = Extension.create({
  name: "smartSelectAll",

  addKeyboardShortcuts() {
    return {
      "Mod-a": () => {
        const { state, view } = this.editor;
        const pluginState = SMART_SELECT_ALL_KEY.getState(state) ?? IDLE_STATE;

        if (state.selection instanceof AllSelection) {
          const tr = state.tr.setMeta(SMART_SELECT_ALL_KEY, {
            mode: "all-selected",
            from: 0,
            to: state.doc.content.size,
            kind: "text",
          } satisfies SmartSelectState);
          view.dispatch(tr);
          return true;
        }

        const target = resolveBlockTarget(state);
        if (!target) {
          const tr = state.tr
            .setSelection(new AllSelection(state.doc))
            .setMeta(SMART_SELECT_ALL_KEY, {
              mode: "all-selected",
              from: 0,
              to: state.doc.content.size,
              kind: "text",
            } satisfies SmartSelectState);
          view.dispatch(tr.scrollIntoView());
          return true;
        }

        if (isSameSelection(pluginState, target.from, target.to)) {
          const tr = state.tr
            .setSelection(new AllSelection(state.doc))
            .setMeta(SMART_SELECT_ALL_KEY, {
              mode: "all-selected",
              from: 0,
              to: state.doc.content.size,
              kind: "text",
            } satisfies SmartSelectState);
          view.dispatch(tr.scrollIntoView());
          return true;
        }

        const tr = state.tr
          .setSelection(target.selection)
          .setMeta(SMART_SELECT_ALL_KEY, {
            mode: target.mode,
            from: target.from,
            to: target.to,
            kind: target.kind,
          } satisfies SmartSelectState);
        view.dispatch(tr.scrollIntoView());
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SmartSelectState>({
        key: SMART_SELECT_ALL_KEY,
        state: {
          init: () => IDLE_STATE,
          apply: (tr, pluginState) => {
            const meta = tr.getMeta(SMART_SELECT_ALL_KEY) as
              | SmartSelectState
              | undefined;

            if (meta) {
              return meta;
            }

            if (tr.docChanged) {
              return IDLE_STATE;
            }

            if (!tr.selectionSet) {
              return pluginState;
            }

            if (tr.selection instanceof AllSelection) {
              return pluginState.mode === "all-selected"
                ? pluginState
                : IDLE_STATE;
            }

            if (
              pluginState.mode === "block-selected" &&
              tr.selection.from === pluginState.from &&
              tr.selection.to === pluginState.to
            ) {
              return pluginState;
            }

            return IDLE_STATE;
          },
        },
        props: {
          handleDOMEvents: {
            blur: (view) => {
              const currentState =
                SMART_SELECT_ALL_KEY.getState(view.state) ?? IDLE_STATE;
              if (currentState.mode === "idle") {
                return false;
              }
              view.dispatch(
                view.state.tr.setMeta(SMART_SELECT_ALL_KEY, IDLE_STATE),
              );
              return false;
            },
            focus: (view) => {
              const currentState =
                SMART_SELECT_ALL_KEY.getState(view.state) ?? IDLE_STATE;
              if (currentState.mode === "idle") {
                return false;
              }
              view.dispatch(
                view.state.tr.setMeta(SMART_SELECT_ALL_KEY, IDLE_STATE),
              );
              return false;
            },
          },
        },
      }),
    ];
  },
});
