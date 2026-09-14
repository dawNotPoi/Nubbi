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
import Blog from "./views/blog/Blog";
import FileManager from "./views/FileManage";
import Home from "./views/Home";
import { LoginPage } from "./views/Login";
import MeetingAccessGuard from "./views/MeetingRoom/MeetingAccessGuard";
import Meetings from "./views/Mettings";
import PostTable from "./views/PostTable";
import { ResetPasswordPage } from "./views/ResetPassword";

const UserLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="flex-1 h-screen overflow-hidden">
        <main className="h-screen overflow-y-auto pb-10">
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
            <Route path="note/:Id" element={<Blog />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};
