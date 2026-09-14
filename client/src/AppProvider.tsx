import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect } from "react";
import { ModalProvider } from "./component/UI/Dialog";
import UploadLifecycle from "./component/upload/UploadLifecycle";
import { restoreAuthSession } from "./utils/auth";
import { queryClient } from "./utils/queryClient";

/**
 * 将 React Query 的 queryClient 单例桥接到 jotai 的 queryClientAtom，
 * 使 atomWithQuery / atomWithMutation 与组件里的 useQuery 共享同一实例和缓存。
 */
const HydrateQueryClient = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  return children;
};

/**
 * 应用启动时的会话恢复（无 UI）：首次挂载调用 restoreAuthSession，
 * 从服务端拉取会话并写回内存 token，标记 initialized，让路由守卫知道登录态已就绪。
 */
const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    void restoreAuthSession();
  }, []);

  return children;
};

/**
 * 应用根 Provider：组装 React Query + jotai 状态树，
 * 并挂载上传生命周期管理与会话恢复等全局副作用。
 */
const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <HydrateQueryClient>
          <AuthBootstrap>
            <UploadLifecycle />
            <ModalProvider>{children}</ModalProvider>
          </AuthBootstrap>
        </HydrateQueryClient>
      </Provider>
    </QueryClientProvider>
  );
};

export default AppProvider;
