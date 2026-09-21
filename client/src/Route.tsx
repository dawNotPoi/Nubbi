import SideBar from "@/component/SideBar";
import MobileErrorBoundary from "@/component/MobileErrorBoundary";
import MobileNavigation from "@/component/MobileNavigation";
import { AuthStatusScreen } from "@/features/auth/components/AuthStatusScreen";
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

/**
 * 使用认证外壳展示会话确认状态，不提前挂载业务布局。
 * @param props 状态、错误和重试动作。
 * @returns 复用固定品牌资产的身份状态页。
 */
const AuthRouteStatus = ({
  state,
  error,
  retrying,
  onRetry,
}: {
  state: "checking" | "unavailable";
  error?: string | null;
  retrying?: boolean;
  onRetry?: () => Promise<unknown>;
}) => (
  <AuthShell>
    <AuthStatusScreen
      error={error}
      onRetry={onRetry}
      retrying={retrying}
      state={state}
    />
  </AuthShell>
);

/**
 * 在会话明确认证前隔离受保护页面，避免渲染旧账号业务树。
 * @param props 受保护路由的子节点。
 * @returns 身份状态页、登录跳转或受保护内容。
 */
const ProtectedRoute = ({ children }: PropsWithChildren): ReactNode => {
  const { error, operation, retrySession, status } = useAuth();
  const location = useLocation();
  if (status === "checking") return <AuthRouteStatus state="checking" />;
  if (status === "unavailable") {
    return (
      <AuthRouteStatus
        error={error}
        onRetry={retrySession}
        retrying={operation === "refreshing"}
        state="unavailable"
      />
    );
  }
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
 * @returns 身份状态页、认证页面或目标页跳转。
 */
const PublicOnlyRoute = ({ children }: PropsWithChildren): ReactNode => {
  const { error, initialized, operation, retrySession, status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    const authenticationInProgress =
      initialized &&
      (operation === "signingIn" || operation === "redirecting");
    if (authenticationInProgress) return children;
    return <AuthRouteStatus state="checking" />;
  }
  if (status === "unavailable") {
    return (
      <AuthRouteStatus
        error={error}
        onRetry={retrySession}
        retrying={operation === "refreshing"}
        state="unavailable"
      />
    );
  }
  if (status === "anonymous") return children;
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
