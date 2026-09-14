import clsx from "clsx";
import { FC, PropsWithChildren } from "react";

export const MenuItemContainer: FC<
  PropsWithChildren & React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => {
  return (
    <div
      {...props}
      className={clsx(
        "hover:bg-normal/40  rounded-md px-2 py-1 cursor-pointer",
        className
      )}
      role="button"
    >
      {children}
    </div>
  );
};

export const IconButton: FC<
  PropsWithChildren<React.HTMLAttributes<HTMLButtonElement>>
> = ({ children, className, onClick, ...props }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-md p-1 text-neutral-500 hover:bg-neutral-400/20 min-w-6 min-h-6 active:bg-neutral-400/40 flex items-center justify-center text-center ",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
