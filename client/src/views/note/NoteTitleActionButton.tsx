import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type NoteTitleActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  icon: ReactNode;
};

export default function NoteTitleActionButton({
  children,
  className,
  icon,
  ...buttonProps
}: NoteTitleActionButtonProps) {
  return (
    <button
      {...buttonProps}
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-lg border border-transparent bg-neutral-100 px-2 text-sm text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
        className,
      )}
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
