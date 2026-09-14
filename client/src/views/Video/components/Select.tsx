import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { AiOutlineUp } from "react-icons/ai";

type SelectProps = {
  children: React.ReactNode;
};

export default function Select({ children }: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const trigger = triggerRef.current;
      const menu = menuRef.current;

      if (menu && menu.contains(event.target as Node)) return;
      if (trigger && trigger.contains(event.target as Node)) return;

      setOpen(false);
    }

    window.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div className="relative z-50 flex items-center">
      <div
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "flex size-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-all",
          open ? "bg-slate-100 text-slate-700" : "hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <AiOutlineUp className={clsx("text-xs transition-transform", open && "rotate-180")} />
      </div>
      {open && (
        <div
          ref={menuRef}
          className="absolute bottom-[calc(100%+4px)] left-1/2 min-w-[220px] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
