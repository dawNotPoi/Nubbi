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
          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors duration-150 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          className,
          isActive && "bg-bg-selected text-text-primary",
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
        "flex min-h-6 min-w-6 items-center justify-center rounded-md p-1 text-center text-text-subtle transition-colors duration-150 hover:bg-bg-icon-hover hover:text-text-primary active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
