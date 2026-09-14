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
  nodeType: string | null;
}

interface TextSelectionTarget {
  selection: TextSelection | NodeSelection;
  mode: Extract<SmartSelectMode, "block-selected">;
  from: number;
  to: number;
  kind: "text" | "node";
  nodeType: string;
}

const SMART_SELECT_ALL_KEY = new PluginKey<SmartSelectState>("smartSelectAll");

const IDLE_STATE: SmartSelectState = {
  mode: "idle",
  from: null,
  to: null,
  kind: null,
  nodeType: null,
};

const CONTENT_SELECTION_NODE_NAMES = new Set([
  "listItem",
  "codeBlock",
  "blockquote",
]);
const TABLE_NODE_NAMES = new Set([
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);

const createAllSelectedState = (docSize: number): SmartSelectState => ({
  mode: "all-selected",
  from: 0,
  to: docSize,
  kind: "text",
  nodeType: "doc",
});

const isSameSelection = (state: SmartSelectState, from: number, to: number) => {
  return state.mode === "block-selected" && state.from === from && state.to === to;
};

const isInsideTable = (editorState: EditorState) => {
  const { $from } = editorState.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (TABLE_NODE_NAMES.has($from.node(depth).type.name)) {
      return true;
    }
  }

  return false;
};

const isManualCrossBlockSelection = (
  editorState: EditorState,
  pluginState: SmartSelectState,
  target: TextSelectionTarget | null,
) => {
  const { selection } = editorState;

  if (selection.empty || selection instanceof NodeSelection) {
    return false;
  }

  if (target && isSameSelection(pluginState, target.from, target.to)) {
    return false;
  }

  return !selection.$from.sameParent(selection.$to);
};

const resolveTextSelectTarget = (
  editorState: EditorState,
): TextSelectionTarget | null => {
  const { selection, doc } = editorState;

  if (isInsideTable(editorState)) {
    return null;
  }

  if (selection instanceof NodeSelection && selection.node.isAtom) {
    return {
      selection,
      mode: "block-selected",
      from: selection.from,
      to: selection.to,
      kind: "node",
      nodeType: selection.node.type.name,
    };
  }

  const $from = selection.$from;
  let preferredTextRange: { from: number; to: number; nodeType: string } | null =
    null;
  let preferredNodeTarget: { pos: number; nodeType: string } | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    const before = $from.before(depth);
    const start = $from.start(depth);
    const end = $from.end(depth);

    if (CONTENT_SELECTION_NODE_NAMES.has(node.type.name)) {
      if (node.isTextblock || node.isBlock) {
        return {
          selection: TextSelection.create(doc, start, end),
          mode: "block-selected",
          from: start,
          to: end,
          kind: "text",
          nodeType: node.type.name,
        };
      }
    }

    if (
      preferredNodeTarget === null &&
      (node.isAtom || node.type.name === "image")
    ) {
      preferredNodeTarget = {
        pos: before,
        nodeType: node.type.name,
      };
    }

    if (
      preferredTextRange === null &&
      node.isTextblock &&
      node.type.name !== "codeBlock"
    ) {
      preferredTextRange = {
        from: start,
        to: end,
        nodeType: node.type.name,
      };
    }
  }

  if (preferredNodeTarget !== null) {
    const nodeSelection = NodeSelection.create(doc, preferredNodeTarget.pos);
    return {
      selection: nodeSelection,
      mode: "block-selected",
      from: nodeSelection.from,
      to: nodeSelection.to,
      kind: "node",
      nodeType: preferredNodeTarget.nodeType,
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
      nodeType: preferredTextRange.nodeType,
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
          const tr = state.tr.setMeta(
            SMART_SELECT_ALL_KEY,
            createAllSelectedState(state.doc.content.size),
          );
          view.dispatch(tr);
          return true;
        }

        const target = resolveTextSelectTarget(state);
        if (isInsideTable(state)) {
          return false;
        }

        if (isManualCrossBlockSelection(state, pluginState, target)) {
          const tr = state.tr
            .setSelection(new AllSelection(state.doc))
            .setMeta(
              SMART_SELECT_ALL_KEY,
              createAllSelectedState(state.doc.content.size),
            );
          view.dispatch(tr.scrollIntoView());
          return true;
        }

        if (!target) {
          const tr = state.tr
            .setSelection(new AllSelection(state.doc))
            .setMeta(
              SMART_SELECT_ALL_KEY,
              createAllSelectedState(state.doc.content.size),
            );
          view.dispatch(tr.scrollIntoView());
          return true;
        }

        if (isSameSelection(pluginState, target.from, target.to)) {
          const tr = state.tr
            .setSelection(new AllSelection(state.doc))
            .setMeta(
              SMART_SELECT_ALL_KEY,
              createAllSelectedState(state.doc.content.size),
            );
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
            nodeType: target.nodeType,
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
