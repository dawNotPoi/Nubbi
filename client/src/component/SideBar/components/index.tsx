import clsx from "clsx";
import { FC, PropsWithChildren } from "react";
import { NavLink, NavLinkProps } from "react-router-dom";

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
      className={({ isActive }) => {
        return clsx(
          "hover:bg-gray-200/40  rounded-md px-2 py-1 cursor-pointer flex items-center gap-2",
          className,
          isActive && "bg-neutral-400/10",
        );
      }}
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
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(e);
      }}
      className={clsx(
        "rounded-md p-1 text-neutral-500 hover:bg-neutral-400/20 min-w-6 min-h-6 active:bg-neutral-400/40 flex items-center justify-center text-center ",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
