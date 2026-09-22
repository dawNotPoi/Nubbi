import type { FileListItem } from "@/api/file";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
        <button
          aria-label={`${props.item.name} 更多操作`}
          className="file-more-button"
          onClick={stop}
          type="button"
        >
          <MoreHorizontal className="size-4" />
        </button>
          }
        />
        <DropdownMenuContent aria-label={`${props.item.name} 操作`}>
          {items.map((item) =>
            "type" in item ? (
              <Separator className="my-1" key={item.key} />
            ) : (
              <DropdownMenuItem
                destructive={item.destructive}
                key={item.key}
                onClick={item.onClick}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
