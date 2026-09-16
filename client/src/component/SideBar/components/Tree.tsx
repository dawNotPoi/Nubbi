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
    "flex size-6 shrink-0 items-center justify-center rounded-[5px] text-text-subtle",
    "opacity-0 transition hover:bg-bg-icon-hover hover:text-text-primary",
    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    "group-hover/tree-item:opacity-100",
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
      <div className="truncate text-[13px] leading-5">{title}</div>
      {pathLabel ? (
        <div className="truncate text-[11px] leading-4 text-text-subtle">
          {pathLabel}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={clsx(
        "group/tree-item mt-0.5 flex min-h-7 items-center rounded-[6px] pr-1",
        "font-normal text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary",
        active &&
          "bg-bg-selected font-medium text-text-primary shadow-[inset_2px_0_0_var(--brand)]",
        loading && "pointer-events-none opacity-70",
        className,
      )}
      style={{ paddingLeft: depthPadding(depth) }}
    >
      {onToggle && hasChildren ? (
        <span className="relative mr-0.5 flex size-6 shrink-0 items-center justify-center">
          <FileText
            className={clsx(
              "size-4 text-text-subtle transition-opacity",
              "group-hover/tree-item:opacity-0 group-focus-within/tree-item:opacity-0",
            )}
          />
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse note" : "Expand note"}
            className={clsx(
              "absolute inset-0 flex items-center justify-center rounded-[5px] text-text-subtle",
              "pointer-events-none opacity-0 transition",
              "hover:bg-bg-icon-hover hover:text-text-primary",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              "group-hover/tree-item:pointer-events-auto group-hover/tree-item:opacity-100",
              "group-focus-within/tree-item:pointer-events-auto group-focus-within/tree-item:opacity-100",
            )}
            onClick={(event) => {
              stopActionEvent(event);
              onToggle();
            }}
            type="button"
          >
            <ChevronRight
              className={clsx(
                "size-4 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        </span>
      ) : (
        <span className="mr-0.5 flex size-6 shrink-0 items-center justify-center text-text-subtle">
          <FileText className="size-4" />
        </span>
      )}
      {to ? (
        <NavLink
          className="min-w-0 flex-1 rounded-[4px] py-1 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          to={to}
        >
          {content}
        </NavLink>
      ) : (
        <button
          className="min-w-0 flex-1 rounded-[4px] py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
            className="flex min-h-7 items-center gap-2 pr-2"
            key={index}
            style={{ paddingLeft: depthPadding(depth) + 6 }}
          >
            <div className="size-4 shrink-0 animate-pulse rounded bg-skeleton" />
            <div
              className={clsx(
                "h-3 animate-pulse rounded bg-skeleton",
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
      className="py-1 pr-2 text-[12px] leading-5 text-text-subtle"
      style={{ paddingLeft: depthPadding(depth) + 30 }}
    >
      <span>{message ?? (type === "error" ? "Failed to load" : "No notes")}</span>
      {type === "error" && onRetry ? (
        <button
          className="ml-2 rounded px-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
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
        "group/sidebar-section flex items-center rounded-[6px] px-2 py-1",
        "cursor-pointer",
        "font-normal text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      <button
        aria-expanded={open}
        className="flex min-w-0 flex-1 items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 truncate">{title}</span>
        <ChevronRight
          className={clsx(
            "ml-1 size-4 shrink-0 text-text-subtle opacity-0 transition",
            "group-hover/sidebar-section:opacity-100 group-focus-within/sidebar-section:opacity-100",
            open && "rotate-90",
          )}
        />
      </button>
      {actions.length > 0 ? (
        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          {actions.map((action) => {
            const className = clsx(
              "flex size-6 items-center justify-center rounded-[5px] text-text-subtle",
              "opacity-0 transition hover:bg-bg-icon-hover hover:text-text-primary",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              "group-hover/sidebar-section:opacity-100",
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
