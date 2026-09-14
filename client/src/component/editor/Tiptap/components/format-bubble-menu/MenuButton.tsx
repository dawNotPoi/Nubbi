import clsx from "clsx";
import type { ReactNode } from "react";

interface MenuButtonProps {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}

const MenuButton = ({
  active,
  children,
  disabled,
  label,
  onClick,
}: MenuButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={clsx(
      "flex size-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-35",
      active
        ? "border-[rgba(55,53,47,0.18)] bg-[rgba(55,53,47,0.08)] text-[rgba(55,53,47,0.92)]"
        : "border-transparent bg-transparent text-[rgba(55,53,47,0.68)] hover:border-[rgba(55,53,47,0.12)] hover:bg-[rgba(55,53,47,0.05)] hover:text-[rgba(55,53,47,0.9)]",
    )}
  >
    {children}
  </button>
);

export default MenuButton;
