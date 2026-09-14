import { Header } from "@/component/Header";
import SideBar from "@/component/SideBar";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import FileManager from "./views/FileManager";
import Home from "./views/Home";
import { LoginPage } from "./views/Login";
import PostTable from "./views/PostTable";
import Blog from "./views/blog/Blog";
import Video from "./views/video";

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

export const RouteWrapper = () => {
  return (
    <BrowserRouter>
      <div className="App mx-auto overflow-hidden">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/video" element={<Video />} />
          <Route path=":user" element={<UserLayout />}>
            <Route index element={<Home />} />
            <Route path="table" element={<PostTable />} />
            <Route path="file" element={<FileManager />} />
            <Route path="note/:Id" element={<Blog />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};
