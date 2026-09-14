import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import type { SuggestionListRef } from "./SuggestionList";
import SuggestionPopover from "./SuggestionPopover";
import { getSuggestions } from "./suggestions";
import type { SuggestionItem } from "./suggestions";

const slashCommandPluginKey = new PluginKey("slashCommand");
type SlashSuggestionProps = SuggestionProps<SuggestionItem>;

const suggestion: Omit<SuggestionOptions<SuggestionItem>, "editor"> = {
  char: "/",
  pluginKey: slashCommandPluginKey,
  allowedPrefixes: null,
  decorationClass: "dn-editor__slash-command-match",
  decorationEmptyClass: "dn-editor__slash-command-match--empty",
  initialItems: getSuggestions({ query: "" }),
  items: getSuggestions,
  render: () => {
    let component: ReactRenderer<SuggestionListRef> | null = null;

    const withPopoverProps = (props: SlashSuggestionProps) => ({
      ...props,
      onClickOutside: () => {
        exitSuggestion(props.editor.view, slashCommandPluginKey);
      },
    });

    const ensureComponent = (props: SlashSuggestionProps) => {
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
      onStart: (props: SlashSuggestionProps) => {
        ensureComponent(props);
      },

      onUpdate: (props: SlashSuggestionProps) => {
        ensureComponent(props);
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
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
