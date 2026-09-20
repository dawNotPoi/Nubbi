import clsx from "clsx";
import { FC, PropsWithChildren } from "react";
import { NavLink, NavLinkProps } from "react-router-dom";

// eslint-disable-next-line react-refresh/only-export-components
export * from "./Tree";

export const MenuItemContainer: FC<NavLinkProps> = ({
  children,
  className,
  to,
  ...props
}) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-[15px] font-normal text-text-muted transition-[background-color,color,transform] active:scale-[0.99] active:bg-bg-selected hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:min-h-8 md:rounded-compact md:px-2 md:py-1.5 md:text-sm",
          className,
          isActive && "bg-bg-selected font-medium text-text-primary",
        )
      }
      role="button"
      {...props}
    >
      {children}
    </NavLink>
  );
};

export const IconButton: FC<
  PropsWithChildren<React.HTMLAttributes<HTMLButtonElement>>
> = ({ children, className, onClick, ...props }) => {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick?.(event);
      }}
      className={clsx(
        "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control p-1 text-center text-text-subtle transition-[background-color,color,transform] active:scale-[0.97] active:bg-bg-selected hover:bg-bg-icon-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:min-h-7 md:min-w-7 md:rounded-compact",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
