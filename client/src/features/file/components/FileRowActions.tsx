import type { FileListItem } from "@/api/file";
import { Dropdown } from "antd";
import { MoreHorizontal } from "lucide-react";
import type { MouseEvent, ReactElement } from "react";
import {
  buildFileRowMenuItems,
  type FileRowActionHandlers,
} from "./fileRowMenu";

export function FileRowActions(
  props: FileRowActionHandlers & { item: FileListItem },
): ReactElement {
  const items = buildFileRowMenuItems(props.item, props);

  const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation();
  return (
    <div className="file-row-actions" onClick={stop}>
      <button
        className="file-open-button"
        onClick={() => props.onOpen(props.item)}
        type="button"
      >
        {props.item.kind === "folder" ? "打开" : "预览"}
      </button>
      <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
        <button
          aria-label={`${props.item.name} 更多操作`}
          className="file-more-button"
          onClick={stop}
          type="button"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </Dropdown>
    </div>
  );
}
