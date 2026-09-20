import { activeUploadCountAtom } from "@/store/atom/FileAtom";
import { mobileBottomNavHiddenAtom } from "@/store/atom/common";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { Ellipsis, FileText, FolderTree, House } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import MobileMoreSheet from "./MobileMoreSheet";

type NavItemProps = {
  active: boolean;
  activeIconClass?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function NavItem({ active, activeIconClass, icon, label, onClick }: NavItemProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1 text-[12px] transition-colors active:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
        active ? "font-medium text-text-primary" : "font-normal text-text-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={clsx(
          "grid size-8 place-items-center rounded-control transition-colors [&>svg]:size-[21px]",
          active && (activeIconClass || "bg-bg-selected text-text-primary"),
        )}
      >
        {icon}
      </span>
      <span className="max-w-full truncate leading-4">{label}</span>
    </button>
  );
}

export default function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeUploads = useAtomValue(activeUploadCountAtom);
  const hidden = useAtomValue(mobileBottomNavHiddenAtom);
  const [moreOpen, setMoreOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <nav
        aria-label="移动端主导航"
        className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(68px+env(safe-area-inset-bottom))] items-start border-t border-border-row bg-white/96 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-lg md:hidden"
      >
        <NavItem
          active={location.pathname === routes.home}
          activeIconClass="bg-[var(--brand-soft)] text-[var(--brand)]"
          icon={<House />}
          label="首页"
          onClick={() => navigate(routes.home)}
        />
        <NavItem
          active={location.pathname === routes.noteLib}
          activeIconClass="bg-[var(--entity-note-soft)] text-[var(--entity-note)]"
          icon={<FileText />}
          label="笔记"
          onClick={() => navigate(routes.noteLib)}
        />
        <NavItem
          active={location.pathname.startsWith(routes.file)}
          activeIconClass="bg-[var(--entity-file-soft)] text-[var(--entity-file)]"
          icon={
            <span className="relative grid size-[21px] place-items-center">
              <FolderTree className="size-[21px]" />
              {activeUploads > 0 ? (
                <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--entity-file)] px-1 text-[9px] leading-4 text-white">
                  {activeUploads > 9 ? "9+" : activeUploads}
                </span>
              ) : null}
            </span>
          }
          label="文件"
          onClick={() => navigate(routes.file)}
        />
        <NavItem
          active={moreOpen}
          icon={<Ellipsis />}
          label="更多"
          onClick={() => setMoreOpen(true)}
        />
      </nav>
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
