import { Header } from "@/component/Header";
import SideBar from "@/component/SideBar";
import { PropsWithChildren } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useSession } from "./utils/auth";
import Blog from "./views/blog/Blog";
import FileManager from "./views/FileManage";
import Home from "./views/Home";
import { LoginPage } from "./views/Login";
import Meetings from "./views/Mettings";
import MeetingAccessGuard from "./views/Mettings/components/MeetingAccessGuard";
import PostTable from "./views/PostTable";

const UserLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="flex-1 h-screen overflow-hidden">
        <Header className="h-[40px]" />
        <main className="pb-10 h-[calc(100vh-40px)]  overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<PropsWithChildren> = ({ children }) => {
  const { data, isPending } = useSession();

  const location = useLocation();
  if (isPending) {
    return null;
  }
  if (data?.user) {
    return children;
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export const RouteWrapper = () => {
  return (
    <BrowserRouter>
      <div className="App mx-auto overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
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
