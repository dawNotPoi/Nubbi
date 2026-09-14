import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  exitSuggestion,
  SuggestionOptions,
} from "@tiptap/suggestion";
import { SuggestionListRef } from "./SuggestionList";
import SuggestionPopover from "./SuggestionPopover";
import { getSuggestions } from "./suggestions";

const slashCommandPluginKey = new PluginKey("slashCommand");

const suggestion: Omit<SuggestionOptions, "editor"> = {
  char: "/",
  pluginKey: slashCommandPluginKey,
  allowedPrefixes: null,
  decorationClass: "dn-editor__slash-command-match",
  decorationEmptyClass: "dn-editor__slash-command-match--empty",
  initialItems: getSuggestions({ query: "" }),
  items: getSuggestions,
  render: () => {
    let component: ReactRenderer<SuggestionListRef> | null = null;

    const withPopoverProps = (props: any) => ({
      ...props,
      onClickOutside: () => {
        exitSuggestion(props.editor.view, slashCommandPluginKey);
      },
    });

    const ensureComponent = (props: any) => {
      if (component) {
        component.updateProps(withPopoverProps(props));
        return;
      }

      component = new ReactRenderer(SuggestionPopover, {
        props: withPopoverProps(props),
        editor: props.editor,
      });
    };

    const destroyComponent = () => {
      component?.destroy();
      component = null;
    };

    return {
      onStart: (props: any) => {
        ensureComponent(props);
      },

      onUpdate: (props: any) => {
        ensureComponent(props);
      },

      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          destroyComponent();
          return false;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        destroyComponent();
      },
    };
  },
};

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestion,
      }),
    ];
  },
});
