import {
  type Note,
  type UpdateNotePropertiesInput,
} from "@/api/note";
import { deleteTagAtom, tagListAtom } from "@/store/atom/tagAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Select } from "./Select";

export default function NoteMeta({
  data,
  className,
  mode = "tags",
  onUpdate,
}: {
  data: Note;
  className?: string;
  mode?: "tags" | "trigger";
  onUpdate: (newData: UpdateNotePropertiesInput) => void;
}) {
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

  return (
    <div className={clsx(mode === "tags" && tags.length > 0 && "mb-2 min-h-7", className)}>
      {mode === "tags" && tags.length === 0 ? null : (
      <Select
        value={tags}
        className={clsx(
          mode === "trigger" &&
            "bg-neutral-100 px-2 text-neutral-500 hover:bg-neutral-200",
        )}
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
