import { Post } from "@/api/post";
import { DatePicker, Input, Select, SelectProps } from "antd";
import dayjs from "dayjs";
import { useCallback, useState } from "react";

const tagsOptions: SelectProps["options"] = [
  { value: "算法" },
  { value: "React" },
  { value: "Node" },
];

const statusOptions: SelectProps["options"] = [
  { value: "Invisible" },
  { value: "Draft" },
  { value: "Published" },
];

const typeOptions: SelectProps["options"] = [
  { value: "Note" },
  { value: "Thinking" },
  { value: "Share" },
];

type property = {
  id: string;
  name: string;
  type: "select" | "date" | "multi-select" | "input";
  options?: any;
};

const formSchema: property[] = [
  {
    id: "status",
    name: "状态",
    type: "select",
    options: statusOptions,
  },
  { id: "date", name: "日期", type: "date" },
  { id: "tags", name: "标签", type: "multi-select", options: tagsOptions },
  { id: "summary", name: "摘要", type: "input" },
  { id: "type", name: "类型", type: "select", options: typeOptions },
];

export default function BlogMeta({
  data,
  className,
  onUpdate,
}: {
  data: Post;
  className?: string;
  onUpdate: (newData: Post["meta"]) => void;
}) {
  const [meta, setMeta] = useState<Record<string, any>>({
    ...data.meta,
  });

  const handlerFormChange = useCallback(
    (newValue: string | any[], property?: property) => {
      setMeta((v) => {
        const tmp = { ...v, [property!.id]: newValue };
        onUpdate(tmp);
        return tmp;
      });
    },
    []
  );

  return (
    <div className={className}>
      <form>
        {formSchema.map((item) => {
          return (
            <li key={item.id} className="flex gap-1 h-10 ">
              <label className="w-[200px] rounded-sm text-slate-500 hover:bg-gray-100/60 p-2 items-center flex">
                {item.name}
              </label>
              <div className="flex-1 h-full flex items-center hover:bg-gray-100/60">
                <InputRender
                  onChange={handlerFormChange}
                  property={item}
                  value={meta[item.id]}
                />
              </div>
            </li>
          );
        })}
      </form>
    </div>
  );
}

type InputRenderProps = {
  value: any;
  property: property;
  onChange?: (value: any, property?: property) => void;
};
const InputRender = ({ property, value, onChange }: InputRenderProps) => {
  const placeholder = "Empty";
  switch (property.type) {
    case "multi-select":
      return (
        <Select
          defaultValue={value}
          className="w-full"
          variant="borderless"
          placeholder={placeholder}
          mode="multiple"
          onChange={(v) => {
            onChange?.(v, property);
          }}
          options={property.options}
        ></Select>
      );
    case "date":
      return (
        <DatePicker
          variant="borderless"
          placeholder={placeholder}
          defaultValue={dayjs(value)}
          onChange={(v) => {
            onChange?.(v.valueOf(), property);
          }}
          className="w-full"
        ></DatePicker>
      );
    case "select":
      return (
        <Select
          defaultValue={value}
          variant="borderless"
          className="w-full"
          onChange={(v) => {
            onChange?.(v, property);
          }}
          placeholder={placeholder}
          options={property.options}
        ></Select>
      );
    case "input":
      return (
        <Input
          defaultValue={value}
          variant="borderless"
          className="w-full"
          onChange={(e) => {
            onChange?.(e.target.value, property);
          }}
          placeholder={placeholder}
        ></Input>
      );
    default:
      return <></>;
  }
};
