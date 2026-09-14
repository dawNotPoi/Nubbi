import { Select } from "@/component/UI/Select";
import { SelectProps, Tag } from "antd";
import { useEffect, useState } from "react";
import { Post } from "../../api/post";

const tagsOptions: SelectProps["options"] = [{ value: "Note" }];

const statusOptions: SelectProps["options"] = [
  { value: "Invisible" },
  { value: "Draft" },
  { value: "Published" },
];

const optionRender = (option: any) => {
  const color = option.value.length > 5 ? "geekblue" : "green";
  return <Tag color={color}>{option.value}</Tag>;
};
export default function BlogMeta({
  data,
  className,
  onUpdate,
}: {
  data: Post;
  className?: string;
  onUpdate: (
    newData: Partial<
      Pick<typeof data, "status" | "updatedAt" | "summary" | "tags">
    >
  ) => void;
}) {
  const [cardData, setCardData] = useState<
    Pick<typeof data, "status" | "updatedAt" | "summary" | "tags">
  >({
    status: data.status,
    updatedAt: data.updatedAt,
    summary: data.summary,
    tags: data.tags,
  });
  useEffect(() => {
    setCardData({
      status: data.status,
      updatedAt: data.updatedAt,
      summary: data.summary,
      tags: data.tags,
    });
  }, [data]);

  const updatePost = (
    newData: Partial<
      Pick<typeof data, "status" | "updatedAt" | "summary" | "tags">
    >
  ) => {
    setCardData((v) => {
      const tmp = { ...v, ...newData };
      onUpdate(tmp);
      return tmp;
    });
  };

  const formMeta = [
    {
      label: "状态",
      type: "select",
      value: cardData.status,
      options: statusOptions,
    },
  ];

  return (
    <div className={className}>
      <ul>
        {formMeta.map((item) => {
          return (
            <li key={item.label} className="flex gap-1 h-10">
              <label
                htmlFor="status"
                className="w-[200px] rounded-sm text-slate-500 hover:bg-normalGray p-2 items-center flex"
              >
                {item.label}
              </label>
              <Select
                defaultValue={item.value}
                className="flex-1 rounded-sm hover:bg-normalGray"
              ></Select>
            </li>
          );
        })}

        {/* <label className="w-20" htmlFor="status">
          状态
        </label>
        <div className="value">
          <div>
            <Select
              placeholder="select one tag"
              value={cardData.status}
              onChange={(value) => {
                updatePost({ status: value });
              }}
              variant="borderless"
              style={{ width: "100%", height: "100%" }}
              optionRender={optionRender}
              options={statusOptions}
            />
          </div>
        </div> */}
      </ul>
      {/* <div className="col">
        <label htmlFor="date">{"日期"}</label>
        <div className="value">
          <div>
            <DatePicker
              defaultValue={dayjs()}
              style={{ width: "100%" }}
              variant="borderless"
              onChange={(_, dateString: any) => {
                // updatePost({ updatedAt: dateString });
              }}
              value={dayjs(cardData?.updatedAt || dayjs())}
              suffixIcon=""
            />
          </div>
        </div>
      </div> */}
      {/* <div className="col">
        <label htmlFor="summary">{"summary"}</label>
        <div className="value">
          <div style={{ height: "100%" }}>
            <Input.TextArea
              placeholder="EMPTY"
              defaultValue={"EMPTY"}
              value={cardData.summary}
              maxLength={200}
              variant="borderless"
              onChange={(e) => {
                setCardData((v: any) => {
                  return {
                    ...v,
                    summary: e.target.value,
                  };
                });
              }}
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
        </div>
      </div> */}
      {/* <div className="col">
        <label htmlFor="tags">标签</label>
        <div className="value">
          <div>
            <Select
              mode="tags"
              placeholder="select your tags"
              value={cardData.tags}
              onChange={(value) => {
                setCardData({ ...cardData, tags: value });
              }}
              variant="borderless"
              style={{ width: "100%", height: "100%" }}
              optionRender={optionRender}
              tagRender={(tags) => {
                const color = tags.value?.length > 5 ? "geekblue" : "green";
                return <Tag color={color}>{tags.value}</Tag>;
              }}
              options={tagsOptions}
            />
          </div>
        </div>
      </div> */}
    </div>
  );
}
