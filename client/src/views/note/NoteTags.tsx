import {
  type Note,
  type UpdateNotePropertiesInput,
} from "@/api/note";
import { deleteTagAtom, tagListAtom } from "@/store/atom/tagAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NOTE_TITLE_ACTION_CLASS } from "./noteActionStyle";
import { Select } from "./Select";

const DEFAULT_NOTE_TAG = "note";

type NoteTagsMode = "tags" | "trigger";

type NoteTagsProps = {
  data: Note;
  className?: string;
  mode?: NoteTagsMode;
  onUpdate: (newData: UpdateNotePropertiesInput) => void;
};

export default function NoteTags({
  data,
  className,
  mode = "tags",
  onUpdate,
}: NoteTagsProps) {
  const [tags, setTags] = useState<string[]>(() => data.tags);
  const tagsQuery = useAtomValue(tagListAtom);
  const deleteTagMutation = useAtomValue(deleteTagAtom);

  useEffect(() => {
    setTags(data.tags);
  }, [data.tags]);

  const handleTagsChange = useCallback(
    (nextValue: string | string[]) => {
      const nextTags = Array.isArray(nextValue) ? nextValue : [];
      setTags(nextTags);
      onUpdate({ tags: nextTags });
    },
    [onUpdate],
  );

  const handleDeleteTag = useCallback(
    (tagName: string) => {
      deleteTagMutation.mutate({ name: tagName });
    },
    [deleteTagMutation],
  );

  const addDefaultTag = useCallback(() => {
    if (tags.length > 0) return;
    const nextTags = [DEFAULT_NOTE_TAG];
    setTags(nextTags);
    onUpdate({ tags: nextTags });
  }, [onUpdate, tags.length]);

  if (mode === "trigger") {
    return (
      <button
        className={clsx(NOTE_TITLE_ACTION_CLASS, className)}
        onClick={addDefaultTag}
        type="button"
      >
        <Tag className="size-4" />
        <span>添加标签</span>
      </button>
    );
  }

  return (
    <div
      className={clsx(tags.length > 0 && "mb-2 min-h-7", className)}
    >
      {tags.length === 0 ? null : (
        <Select
          value={tags}
          placeholder="添加标签"
          mode="multiple"
          creatable
          variant="inline"
          onChange={handleTagsChange}
          onDeleteOption={handleDeleteTag}
          options={tagsQuery.data ?? []}
        />
      )}
    </div>
  );
}
