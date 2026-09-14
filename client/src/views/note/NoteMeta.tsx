import {
  metaEntriesToRecord,
  type Note,
  type NoteStatus,
  type UpdateNotePropertiesInput,
} from "@/api/note";
import { deleteTagAtom, tagListAtom } from "@/store/atom/tagAtom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Select } from "./Select";

const statusOptions: NoteStatus[] = ["inbox", "active", "done", "archived"];

type Property = {
  id: "status" | "date" | "tags";
  name: string;
  type: "select" | "date" | "multi-select";
  options?: string[];
};

const getMetaRecord = (note: Note) => ({
  ...metaEntriesToRecord(note.meta),
  date: note.date,
  status: note.status,
  tags: note.tags,
});

export default function NoteMeta({
  data,
  className,
  onUpdate,
}: {
  data: Note;
  className?: string;
  onUpdate: (newData: UpdateNotePropertiesInput) => void;
}) {
  const [meta, setMeta] = useState<Record<string, any>>(() =>
    getMetaRecord(data),
  );
  const tagsQuery = useAtomValue(tagListAtom);
  const deleteTagMutation = useAtomValue(deleteTagAtom);

  const formSchema: Property[] = [
    {
      id: "status",
      name: "状态",
      type: "select",
      options: statusOptions,
    },
    { id: "date", name: "日期", type: "date" },
    {
      id: "tags",
      name: "标签",
      type: "multi-select",
      options: tagsQuery.data ?? [],
    },
  ];

  useEffect(() => {
    setMeta(getMetaRecord(data));
  }, [data]);

  const handlerFormChange = useCallback(
    (newValue: string | any[], property?: Property) => {
      if (!property) return;

      setMeta((current) => {
        const nextMeta = { ...current, [property.id]: newValue };
        onUpdate({ [property.id]: newValue });
        return nextMeta;
      });
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
    <div className={className}>
      <form>
        {formSchema.map((item) => (
          <li key={item.id} className="flex min-h-10 gap-1">
            <label className="flex w-[200px] items-center rounded-sm p-2 text-slate-500 hover:bg-gray-100/60">
              {item.name}
            </label>
            <div className="min-h-10 flex-1 items-center hover:bg-gray-100/60">
              <InputRender
                onChange={handlerFormChange}
                onDeleteOption={item.id === "tags" ? handleDeleteTag : undefined}
                property={item}
                value={meta[item.id]}
              />
            </div>
          </li>
        ))}
      </form>
    </div>
  );
}

type InputRenderProps = {
  value: any;
  property: Property;
  onChange?: (value: any, property?: Property) => void;
  onDeleteOption?: (value: string) => void;
};

const InputRender = ({
  property,
  value,
  onChange,
  onDeleteOption,
}: InputRenderProps) => {
  const placeholder = "Empty";

  switch (property.type) {
    case "multi-select":
      return (
        <Select
          value={Array.isArray(value) ? value : []}
          className="w-full"
          placeholder={placeholder}
          mode="multiple"
          creatable
          onChange={(nextValue) => {
            onChange?.(nextValue, property);
          }}
          onDeleteOption={onDeleteOption}
          options={property.options}
        />
      );
    case "date":
      return (
        <DatePicker
          variant="borderless"
          placeholder={placeholder}
          value={value ? dayjs(value) : null}
          onChange={(nextValue) => {
            onChange?.(nextValue ? nextValue.toISOString() : undefined, property);
          }}
          className="w-full"
        />
      );
    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          className="w-full"
          placeholder={placeholder}
          mode="single"
          onChange={(nextValue) => {
            onChange?.(nextValue, property);
          }}
          options={property.options}
        />
      );
    default:
      return <></>;
  }
};
