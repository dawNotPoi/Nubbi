import SideBar from "@/component/SideBar";
import { useAuth } from "@/hooks/useAuth";
import { PropsWithChildren } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Blog from "./views/blog";
import FileManager from "./views/file-manage";
import Home from "./views/home";
import { LoginPage } from "./views/login";
import MeetingAccessGuard from "./views/meeting-room/MeetingAccessGuard";
import Meetings from "./views/meetings";
import NoteAI from "./views/note-ai";
import PostTable from "./views/PostTable";
import { ResetPasswordPage } from "./views/reset-password";

const UserLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="flex-1 h-screen overflow-hidden">
        <main className="h-screen overflow-y-auto pb-10 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<PropsWithChildren> = ({ children }) => {
  const { initialized, isAuthenticated, sessionPending } = useAuth();
  const location = useLocation();
  if (!initialized || sessionPending) {
    return null;
  }
  if (isAuthenticated) {
    return children;
  }
  const returnTo = encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`,
  );
  return (
    <Navigate
      to={`/login?returnTo=${returnTo}`}
      state={{ from: location }}
      replace
    />
  );
};

export const RouteWrapper = () => {
  return (
    <BrowserRouter>
      <div className="App mx-auto overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="table" element={<PostTable />} />
            <Route path="file/*" element={<FileManager />} />
            <Route path="note-ai" element={<NoteAI />} />
            <Route path="note/:Id" element={<Blog />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};
