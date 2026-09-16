import { Header } from "@/component/Header";
import { isSafeInternalPath, routes } from "@/utils/routes";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type MobileSecondaryHeaderProps = {
  title: string;
  action?: ReactNode;
  fallback?: string;
};

/** 二级页统一 Back / Title / Action 布局，优先恢复 More Sheet 跳转前的来源页。 */
export default function MobileSecondaryHeader({
  action,
  fallback = routes.home,
  title,
}: MobileSecondaryHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { mobileReturnTo?: string } | null;
  const candidate = state?.mobileReturnTo;
  const returnTo = isSafeInternalPath(candidate) ? candidate : fallback;

  return (
    <Header className="border-b border-border-row bg-surface/98">
      <div className="grid h-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1">
        <button
          aria-label="返回"
          className="grid size-11 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          onClick={() => navigate(returnTo)}
          type="button"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="truncate text-center text-[15px] font-medium text-text-primary">{title}</div>
        <div className="grid size-11 place-items-center">{action}</div>
      </div>
    </Header>
  );
}
