import type { Editor } from "@tiptap/core";
import { type MutableRefObject, useEffect } from "react";
import { EMPTY_DOC } from "../constants";

/**
 * Syncs an external `defaultValue` (markdown string) into the editor,
 * without re-firing `onChange` during the sync.
 *
 * `contentRef` is updated by the caller in the editor's `onUpdate` handler,
 * and read here to decide whether an incoming `defaultValue` change is stale.
 */
export function useContentSync(
  editor: Editor | null,
  externalValue: string | undefined,
  contentRef: MutableRefObject<string>,
  canApplyExternalContent = true,
) {
  useEffect(() => {
    if (!editor || !canApplyExternalContent) return;
    const nextValue = externalValue ?? "";
    if (contentRef.current === nextValue) return;

    contentRef.current = nextValue;
    const nextContent = nextValue.trim()
      ? { content: nextValue, contentType: "markdown" as const }
      : { content: EMPTY_DOC, contentType: "json" as const };

    editor.commands.setContent(nextContent.content, {
      contentType: nextContent.contentType,
      emitUpdate: false,
    });
  }, [canApplyExternalContent, externalValue, editor, contentRef]);
}
