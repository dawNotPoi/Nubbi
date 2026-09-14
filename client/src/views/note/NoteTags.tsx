import {
  type Note,
  type UpdateNotePropertiesInput,
} from "@/api/note";
import { deleteTagAtom, tagListAtom } from "@/store/atom/tagAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Select } from "./Select";

type NoteTagsProps = {
  data: Note;
  className?: string;
  onUpdate: (newData: UpdateNotePropertiesInput) => void;
};

export default function NoteTags({
  data,
  className,
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
