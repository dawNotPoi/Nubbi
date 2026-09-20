import clsx from "clsx";
import { ChevronRight, FileText } from "lucide-react";
import { Fragment, MouseEvent, ReactNode } from "react";
import { NavLink } from "react-router-dom";

export type SidebarTreeAction = {
  key: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  render?: (className: string) => ReactNode;
  danger?: boolean;
};

type SidebarTreeItemProps = {
  title: ReactNode;
  depth?: number;
  active?: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  loading?: boolean;
  actions?: SidebarTreeAction[];
  to?: string;
  onToggle?: () => void;
  onSelect?: () => void;
  pathLabel?: ReactNode;
  className?: string;
};

type SidebarTreeStateProps = {
  type: "loading" | "empty" | "error";
  depth?: number;
  rows?: number;
  message?: string;
  onRetry?: () => void;
};

type SidebarSectionHeaderProps = {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  actions?: SidebarTreeAction[];
};

const depthPadding = (depth: number) => depth * 8;

const stopActionEvent = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

function SidebarActionButton({ action }: { action: SidebarTreeAction }) {
  const className = clsx(
    "flex size-9 shrink-0 items-center justify-center rounded-control text-text-subtle",
    "opacity-100 transition-[background-color,color,opacity,transform] active:scale-[0.96] active:bg-bg-selected hover:bg-bg-icon-hover hover:text-text-primary",
    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    "md:size-6 md:rounded-compact md:opacity-0 md:group-hover/tree-item:opacity-100",
    action.danger && "hover:text-[var(--danger-text)]",
  );

  if (action.render) {
    return <>{action.render(className)}</>;
  }

  return (
    <button
      aria-label={action.label}
      className={className}
      onClick={(event) => {
        stopActionEvent(event);
        action.onClick?.();
      }}
      title={action.label}
      type="button"
    >
      {action.icon}
    </button>
  );
}

export function SidebarTreeItem({
  title,
  depth = 0,
  active = false,
  expanded = false,
  hasChildren = false,
  loading = false,
  actions = [],
  to,
  onToggle,
  onSelect,
  pathLabel,
  className,
}: SidebarTreeItemProps) {
  const content = (
    <>
      <div className="truncate text-[15px] leading-[22px] md:text-sm md:leading-5">{title}</div>
      {pathLabel ? (
        <div className="truncate text-[12px] leading-4 text-text-subtle md:text-[11px]">
          {pathLabel}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={clsx(
        "group/tree-item mt-0.5 flex min-h-11 items-center rounded-control pr-1 transition-[background-color,color,transform] active:scale-[0.995] md:min-h-7 md:rounded-compact",
        "font-normal text-text-muted hover:bg-bg-hover hover:text-text-primary",
        active && "bg-bg-selected font-medium text-text-primary",
        loading && "pointer-events-none opacity-70",
        className,
      )}
      style={{ paddingLeft: depthPadding(depth) }}
    >
      {onToggle && hasChildren ? (
        <span className="relative mr-0.5 flex size-9 shrink-0 items-center justify-center md:size-6">
          <FileText
            className={clsx(
              "hidden size-4 text-text-subtle transition-opacity md:block",
              "md:group-hover/tree-item:opacity-0 md:group-focus-within/tree-item:opacity-0",
            )}
          />
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "收起笔记" : "展开笔记"}
            className={clsx(
              "absolute inset-0 flex items-center justify-center rounded-control text-text-subtle transition-[background-color,color,opacity,transform] active:scale-[0.94] active:bg-bg-selected hover:bg-bg-icon-hover hover:text-text-primary",
              "pointer-events-auto opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              "md:pointer-events-none md:rounded-compact md:opacity-0",
              "md:group-hover/tree-item:pointer-events-auto md:group-hover/tree-item:opacity-100",
              "md:group-focus-within/tree-item:pointer-events-auto md:group-focus-within/tree-item:opacity-100",
            )}
            onClick={(event) => {
              stopActionEvent(event);
              onToggle();
            }}
            type="button"
          >
            <ChevronRight
              className={clsx(
                "size-[18px] transition-transform md:size-4",
                expanded && "rotate-90",
              )}
            />
          </button>
        </span>
      ) : (
        <span className="mr-0.5 flex size-9 shrink-0 items-center justify-center text-text-subtle md:size-6">
          <FileText className="size-[18px] md:size-4" />
        </span>
      )}
      {to ? (
        <NavLink
          className="min-w-0 flex-1 rounded-compact py-2 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:rounded-compact md:py-1"
          to={to}
        >
          {content}
        </NavLink>
      ) : (
        <button
          className="min-w-0 flex-1 rounded-compact py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:rounded-compact md:py-1"
          onClick={onSelect}
          type="button"
        >
          {content}
        </button>
      )}
      {actions.length > 0 ? (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          {actions.map((action) => (
            <SidebarActionButton action={action} key={action.key} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarTreeState({
  type,
  depth = 0,
  rows = 3,
  message,
  onRetry,
}: SidebarTreeStateProps) {
  if (type === "loading") {
    return (
      <div className="space-y-1 py-1" aria-label="Loading notes">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="flex min-h-10 items-center gap-2 pr-2 md:min-h-7"
            key={index}
            style={{ paddingLeft: depthPadding(depth) + 6 }}
          >
            <div className="size-4 shrink-0 animate-pulse rounded-compact bg-skeleton" />
            <div
              className={clsx(
                "h-3 animate-pulse rounded-compact bg-skeleton",
                index % 3 === 0 && "w-28",
                index % 3 === 1 && "w-20",
                index % 3 === 2 && "w-24",
              )}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="py-1 pr-2 text-[13px] leading-5 text-text-subtle md:text-[12px]"
      style={{ paddingLeft: depthPadding(depth) + 30 }}
    >
      <span>{message ?? (type === "error" ? "Failed to load" : "No notes")}</span>
      {type === "error" && onRetry ? (
        <button
          className="ml-2 min-h-9 rounded-compact px-2 text-text-muted active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary md:min-h-0 md:px-1"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SidebarSectionHeader({
  title,
  open,
  onToggle,
  actions = [],
}: SidebarSectionHeaderProps) {
  return (
    <div
      className={clsx(
        "group/sidebar-section flex min-h-11 items-center rounded-control px-2 py-1 text-[15px] md:min-h-0 md:rounded-compact md:text-sm",
        "cursor-pointer",
        "font-normal text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      <button
        aria-expanded={open}
        className="flex min-h-10 min-w-0 flex-1 items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:min-h-0"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 truncate">{title}</span>
        <ChevronRight
          className={clsx(
            "ml-1 size-[18px] shrink-0 text-text-subtle opacity-100 transition md:size-4 md:opacity-0",
            "md:group-hover/sidebar-section:opacity-100 md:group-focus-within/sidebar-section:opacity-100",
            open && "rotate-90",
          )}
        />
      </button>
      {actions.length > 0 ? (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          {actions.map((action) => {
            const className = clsx(
              "flex size-9 items-center justify-center rounded-control text-text-subtle md:size-6 md:rounded-compact",
              "opacity-100 transition hover:bg-bg-icon-hover hover:text-text-primary md:opacity-0",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              "md:group-hover/sidebar-section:opacity-100",
              action.danger && "hover:text-[var(--danger-text)]",
            );

            if (action.render) {
              return (
                <Fragment key={action.key}>
                  {action.render(className)}
                </Fragment>
              );
            }

            return (
              <button
                aria-label={action.label}
                className={className}
                key={action.key}
                onClick={(event) => {
                  stopActionEvent(event);
                  action.onClick?.();
                }}
                title={action.label}
                type="button"
              >
                {action.icon}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
