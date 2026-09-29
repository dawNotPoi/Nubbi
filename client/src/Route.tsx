import SideBar from "@/component/SideBar";
import MobileErrorBoundary from "@/component/MobileErrorBoundary";
import MobileNavigation from "@/component/MobileNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { resolveAuthReturnTo } from "@/utils/auth";
import { routes } from "@/utils/routes";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Note from "./views/note";
import FileManager from "./views/file-manage";
import Home from "./views/home";
import { LoginPage } from "./views/login";
import { AuthShell } from "./views/login/AuthShell";
import MeetingAccessGuard from "./views/meeting-room/MeetingAccessGuard";
import Meetings from "./views/meetings";
import NoteLibrary from "./views/NoteLibrary";
import NoteTrash from "./views/note-trash";
import { ResetPasswordPage } from "./views/reset-password";

const DesktopUserLayout = () => (
  <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-canvas text-text-primary">
    <SideBar />
    <div className="h-[100dvh] min-w-0 flex-1 overflow-hidden bg-surface">
      <main className="h-[100dvh] min-w-0 overflow-y-auto bg-surface pb-10">
        <Outlet />
      </main>
    </div>
  </div>
);

const isMobilePrimaryRoute = (pathname: string) =>
  pathname === routes.home ||
  pathname === routes.noteLib ||
  pathname === routes.file ||
  pathname.startsWith(`${routes.file}/`);

const MobileUserLayout = () => {
  const location = useLocation();
  const showBottomNavigation = isMobilePrimaryRoute(location.pathname);

  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-surface text-text-primary">
      <main
        className={
          showBottomNavigation
            ? "h-[100dvh] min-w-0 overflow-y-auto bg-surface pb-[calc(68px+env(safe-area-inset-bottom))]"
            : "h-[100dvh] min-w-0 overflow-y-auto bg-surface"
        }
      >
        <MobileErrorBoundary scope="page">
          <Outlet />
        </MobileErrorBoundary>
      </main>
      {showBottomNavigation ? (
        <MobileErrorBoundary scope="navigation">
          <MobileNavigation />
        </MobileErrorBoundary>
      ) : null}
    </div>
  );
};

const UserLayout = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileUserLayout /> : <DesktopUserLayout />;
};

/** @returns 会话确认期间与应用底色融合的轻量进度提示。 */
const AuthRoutePending = (): ReactElement => (
  <div className="min-h-[100dvh] bg-surface" role="status" aria-label="正在确认登录状态">
    <div aria-hidden="true" className="h-0.5 w-full overflow-hidden bg-border-row">
      <div className="h-full w-1/3 animate-pulse bg-[var(--brand)] motion-reduce:animate-none" />
    </div>
  </div>
);

/**
 * 在会话明确认证前隔离受保护页面，避免渲染旧账号业务树。
 * @param props 受保护路由的子节点。
 * @returns 轻量确认提示、登录跳转或受保护内容。
 */
const ProtectedRoute = ({ children }: PropsWithChildren): ReactNode => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "checking") return <AuthRoutePending />;
  if (status === "authenticated") return children;
  const returnTo = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`,
  );
  return (
    <Navigate
      to={`${routes.login}?returnTo=${returnTo}`}
      state={{ from: location }}
      replace
    />
  );
};

/**
 * 在公共认证页面中等待会话确认，并在认证完成后执行安全站内跳转。
 * @param props 公共认证路由的子节点。
 * @returns 轻量确认提示、认证页面或目标页跳转。
 */
const PublicOnlyRoute = ({ children }: PropsWithChildren): ReactNode => {
  const { initialized, operation, status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    const authenticationInProgress =
      initialized &&
      (operation === "signingIn" || operation === "redirecting");
    if (authenticationInProgress) return children;
    return <AuthRoutePending />;
  }
  if (status === "anonymous" || status === "unavailable") return children;
  const queryReturnTo = new URLSearchParams(location.search).get("returnTo");
  const stateFrom = (
    location.state as
      | {
          from?: {
            pathname?: string;
            search?: string;
            hash?: string;
          };
        }
      | undefined
  )?.from;
  const stateReturnTo = stateFrom
    ? `${stateFrom.pathname || ""}${stateFrom.search || ""}${stateFrom.hash || ""}`
    : "";

  return (
    <Navigate
      replace
      to={resolveAuthReturnTo([queryReturnTo, stateReturnTo], routes.home)}
    />
  );
};

/** @returns 包含统一认证守卫的客户端路由树。 */
export const RouteWrapper = (): ReactElement => {
  return (
    <BrowserRouter>
      <div className="App mx-auto overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to={routes.home} replace />} />
          <Route
            path={routes.login}
            element={
              <PublicOnlyRoute>
                <AuthShell>
                  <LoginPage />
                </AuthShell>
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthShell>
                <ResetPasswordPage />
              </AuthShell>
            }
          />
          <Route path="/meeting/:roomId" element={<MeetingAccessGuard />} />
          <Route
            element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route path="home" element={<Home />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="note-lib" element={<NoteLibrary />} />
            <Route path="note-trash" element={<NoteTrash />} />
            <Route path="file/*" element={<FileManager />} />
            <Route path="note/:Id" element={<Note />} />
          </Route>
          <Route path="*" element={<Navigate to={routes.home} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
