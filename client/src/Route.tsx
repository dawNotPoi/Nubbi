import SideBar from "@/component/SideBar";
import MobileErrorBoundary from "@/component/MobileErrorBoundary";
import MobileNavigation from "@/component/MobileNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { resolveReturnTo, routes } from "@/utils/routes";
import { PropsWithChildren } from "react";
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

const AuthRouteFallback = () => (
  <div className="flex h-[100dvh] overflow-hidden bg-canvas">
    <div className="hidden w-52 shrink-0 animate-pulse bg-sidebar px-3 py-2 md:block">
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex items-center gap-2">
          <div className="size-7 rounded bg-bg-selected" />
          <div className="h-4 w-24 rounded bg-bg-selected" />
        </div>
        <div className="h-7 w-full rounded-md bg-bg-selected" />
        <div className="h-7 w-4/5 rounded-md bg-bg-selected" />
        <div className="h-7 w-full rounded-md bg-bg-selected" />
        <div className="h-7 w-3/5 rounded-md bg-bg-selected" />
      </div>
    </div>
    <div className="flex-1 animate-pulse space-y-4 bg-surface px-4 py-6 md:px-8">
      <div className="h-7 w-36 rounded-md bg-bg-hover" />
      <div className="h-4 w-2/3 rounded bg-bg-hover" />
      <div className="h-4 w-1/2 rounded bg-bg-hover" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-xl bg-bg-hover" />
        <div className="h-28 rounded-xl bg-bg-hover" />
      </div>
    </div>
  </div>
);

const ProtectedRoute: React.FC<PropsWithChildren> = ({ children }) => {
  const { hasAccessToken, initialized, isAuthenticated, sessionPending } =
    useAuth();
  const location = useLocation();
  if (!initialized || (!hasAccessToken && sessionPending)) {
    return <AuthRouteFallback />;
  }
  if (isAuthenticated) {
    return children;
  }
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

const PublicOnlyRoute: React.FC<PropsWithChildren> = ({ children }) => {
  const { hasAccessToken, initialized, isAuthenticated, sessionPending } =
    useAuth();
  const location = useLocation();

  if (!initialized || (!hasAccessToken && sessionPending)) {
    return <AuthRouteFallback />;
  }

  if (!isAuthenticated) {
    return children;
  }
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
      to={resolveReturnTo([queryReturnTo, stateReturnTo], routes.home)}
    />
  );
};

export const RouteWrapper = () => {
  return (
    <BrowserRouter>
      <div className="App mx-auto overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to={routes.home} replace />} />
          <Route
            path={routes.login}
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
