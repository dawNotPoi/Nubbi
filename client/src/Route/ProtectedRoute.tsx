// import { useSession } from "@/utils/auth";
// import { Spin } from "antd";
// import React, { useEffect, useState } from "react";
// import { Navigate, useLocation } from "react-router-dom";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   requireAuth?: boolean;
//   fallback?: React.ReactNode;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
//   children,
//   requireAuth = true,
//   fallback,
// }) => {
//   const { data: session } = useSession();
//   const location = useLocation();
//   const [hasInitialized, setHasInitialized] = useState(false);

//   useEffect(() => {
//     // 给 useSession 一些时间来初始化
//     const timer = setTimeout(() => {
//       setHasInitialized(true);
//     }, 200);

//     return () => clearTimeout(timer);
//   }, []);

//   // 检查认证状态
//   const isAuthenticated =
//     session?.user ||
//     (localStorage.getItem("Expire") &&
//       Date.now().toString() < localStorage.getItem("Expire")!);

//   // 如果还没有初始化完成，显示 loading
//   if (!hasInitialized) {
//     return (
//       fallback || (
//         <div className="flex items-center justify-center min-h-screen">
//           <Spin size="large" />
//         </div>
//       )
//     );
//   }

//   // 需要认证但用户未登录（包括 getSession 失败的情况）
//   if (requireAuth && !isAuthenticated) {
//     return <Navigate to="/login" state={{ from: location }} replace />;
//   }

//   // 不需要认证但用户已登录（用于登录页面）
//   if (!requireAuth && isAuthenticated) {
//     const user = session?.user;
//     //登录后跳转至用户主页
//     return <Navigate to={"/" + user?.id!} replace />;
//   }

//   return <>{children}</>;
// };

// export default ProtectedRoute;
