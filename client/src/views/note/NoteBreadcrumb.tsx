import { NotePathItem } from "@/api/note";
import { routes } from "@/utils/routes";
import clsx from "clsx";
import { Fragment, ReactNode, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_TITLE = "Untitled";

export type NoteBreadcrumbItem = NotePathItem;

type NoteBreadcrumbCurrent = {
  _id: string;
  title: string;
};

type NoteBreadcrumbDisplayItem =
  | {
      type: "note";
      item: NoteBreadcrumbItem | NoteBreadcrumbCurrent;
      current?: boolean;
    }
  | {
      type: "ellipsis";
      key: string;
      hiddenItems: NoteBreadcrumbItem[];
    };

type NoteBreadcrumbProps = {
  ancestors?: NoteBreadcrumbItem[];
  current: NoteBreadcrumbCurrent;
  className?: string;
  renderCollapsed?: (items: NoteBreadcrumbItem[]) => ReactNode;
  onSelect?: (item: NoteBreadcrumbItem) => void;
};

const normalizeTitle = (title?: string) => {
  const trimmedTitle = title?.trim();
  return trimmedTitle || DEFAULT_TITLE;
};

export const getNoteBreadcrumbItems = (
  ancestors: NoteBreadcrumbItem[],
  current: NoteBreadcrumbCurrent,
): NoteBreadcrumbDisplayItem[] => {
  if (ancestors.length === 0) {
    return [{ type: "note", item: current, current: true }];
  }

  if (ancestors.length === 1) {
    return [
      { type: "note", item: ancestors[0] },
      { type: "note", item: current, current: true },
    ];
  }

  const root = ancestors[0];
  const parent = ancestors[ancestors.length - 1];
  const hiddenItems = ancestors.slice(1, -1);

  return [
    { type: "note", item: root },
    ...(hiddenItems.length > 0
      ? [{ type: "ellipsis" as const, key: "collapsed", hiddenItems }]
      : []),
    { type: "note", item: parent },
    { type: "note", item: current, current: true },
  ];
};

function BreadcrumbSeparator() {
  return <span className="shrink-0 text-neutral-300">/</span>;
}

export default function NoteBreadcrumb({
  ancestors = [],
  current,
  className,
  renderCollapsed,
  onSelect,
}: NoteBreadcrumbProps) {
  const navigate = useNavigate();
  const displayItems = useMemo(
    () => getNoteBreadcrumbItems(ancestors, current),
    [ancestors, current],
  );

  const selectItem = (item: NoteBreadcrumbItem | NoteBreadcrumbCurrent) => {
    if (item._id === current._id) return;

    onSelect?.(item);
    navigate(routes.note(item._id));
  };

  return (
    <nav
      aria-label="Note path"
      className={clsx(
        "flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm text-neutral-500",
        className,
      )}
    >
      {displayItems.map((displayItem, index) => (
        <Fragment
          key={
            displayItem.type === "note"
              ? displayItem.item._id
              : displayItem.key
          }
        >
          {index > 0 ? <BreadcrumbSeparator /> : null}
          {displayItem.type === "ellipsis" ? (
            <span
              className="shrink-0 rounded-md px-1.5 py-1 text-neutral-400"
              title={displayItem.hiddenItems
                .map((item) => normalizeTitle(item.title))
                .join(" / ")}
            >
              {renderCollapsed?.(displayItem.hiddenItems) ?? "..."}
            </span>
          ) : displayItem.current ? (
            <span
              className="min-w-0 truncate rounded-md px-1.5 py-1 text-neutral-600"
              title={normalizeTitle(displayItem.item.title)}
            >
              {normalizeTitle(displayItem.item.title)}
            </span>
          ) : (
            <button
              className="max-w-[160px] shrink min-w-0 truncate rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
              onClick={() => {
                selectItem(displayItem.item);
              }}
              title={normalizeTitle(displayItem.item.title)}
              type="button"
            >
              {normalizeTitle(displayItem.item.title)}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
