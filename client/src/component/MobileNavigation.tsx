import { newNote } from "@/api/note";
import { mobileSideBarOpenedAtom } from "@/store/atom/common";
import { activeUploadCountAtom } from "@/store/atom/FileAtom";
import { createNoteAtom } from "@/store/atom/noteAtom";
import { useSession } from "@/utils/auth";
import { routes } from "@/utils/routes";
import { useAtom, useAtomValue } from "jotai";
import { FileText, FolderTree, House, Menu, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";

type NavItemProps = {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function NavItem({ active, icon, label, onClick }: NavItemProps) {
  return (
    <button
      className={clsx(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-text-primary" : "text-text-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-7 place-items-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useSession();
  const owner = data?.user.id ?? "";
  const createMutation = useAtomValue(createNoteAtom);
  const activeUploads = useAtomValue(activeUploadCountAtom);
  const [drawerOpen, setDrawerOpen] = useAtom(mobileSideBarOpenedAtom);

  const createRootNote = () => {
    if (!owner || createMutation.isPending) return;
    const note = newNote();
    createMutation.mutate(
      { note },
      { onSuccess: () => navigate(routes.note(note._id)) },
    );
  };

  return (
    <nav
      aria-label="移动端主导航"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start border-t border-border-row bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
    >
      <NavItem
        active={location.pathname === routes.home}
        icon={<House className="size-5" />}
        label="首页"
        onClick={() => navigate(routes.home)}
      />
      <NavItem
        active={location.pathname.startsWith(routes.noteLib)}
        icon={<FileText className="size-5" />}
        label="笔记"
        onClick={() => navigate(routes.noteLib)}
      />
      <button
        aria-label="新建笔记"
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-[11px] text-text-primary disabled:opacity-50"
        disabled={!owner || createMutation.isPending}
        onClick={createRootNote}
        type="button"
      >
        <span className="grid size-9 -translate-y-1 place-items-center rounded-xl bg-text-primary text-white shadow-sm">
          <Plus className="size-5" />
        </span>
        <span className="-mt-1">新建</span>
      </button>
      <NavItem
        active={location.pathname.startsWith(routes.file)}
        icon={
          <span className="relative">
            <FolderTree className="size-5" />
            {activeUploads > 0 && (
              <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-4 text-white">
                {activeUploads > 9 ? "9+" : activeUploads}
              </span>
            )}
          </span>
        }
        label="文件"
        onClick={() => navigate(routes.file)}
      />
      <NavItem
        active={drawerOpen}
        icon={<Menu className="size-5" />}
        label="更多"
        onClick={() => setDrawerOpen(!drawerOpen)}
      />
    </nav>
  );
}
