import { StyleProvider } from "@ant-design/cssinjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { Provider, createStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect, useMemo, type PropsWithChildren, type ReactElement } from "react";
import { ModalProvider } from "./component/UI/Dialog";
import UploadLifecycle from "./component/upload/UploadLifecycle";
import {
  authSessionCoordinator,
  useAuthSessionSnapshot,
} from "./features/auth/model/session-coordinator";
import { authLifecycleRegistry } from "./features/auth/model/auth-lifecycle";
import {
  expandedNodesAtom,
  libraryExpandedNodesAtom,
} from "./store/atom/note/noteAtom";
import { getNubbiAntdTheme } from "./styles/antd-theme";
import { queryClient } from "./utils/queryClient";

let authBootstrapStarted = false;
const appStore = createStore();
const LEGACY_AVATAR_CACHE_KEY = "home_recent_note_user_avatar";
const LEGACY_NAME_CACHE_KEY = "home_recent_note_user_name";

/**
 * 在应用进程内清除旧用户资料并只发起一次首次会话恢复。
 * @returns 无返回值。
 */
const startAuthBootstrap = (): void => {
  if (authBootstrapStarted) return;
  authBootstrapStarted = true;
  try {
    window.localStorage.removeItem(LEGACY_AVATAR_CACHE_KEY);
    window.localStorage.removeItem(LEGACY_NAME_CACHE_KEY);
  } catch {
    // 浏览器禁用存储时仍继续恢复当前会话。
  }
  void authSessionCoordinator.bootstrap();
};

/**
 * 让 Jotai 查询原子与组件查询共享同一个缓存。
 * @param props 需要查询上下文的子树。
 * @returns 完成查询实例注入的子树。
 */
const HydrateQueryClient = ({ children }: PropsWithChildren): ReactElement => {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  return <>{children}</>;
};

/**
 * 启动唯一会话协调器，严格模式重复挂载不会重复恢复。
 * @param props 应用子树。
 * @returns 原样传递的子树。
 */
const AuthBootstrap = ({ children }: PropsWithChildren): ReactElement => {
  const snapshot = useAuthSessionSnapshot();

  useEffect(() => {
    const unsubscribeIdentity = authSessionCoordinator.subscribeIdentityLifecycle(
      ({ generation }) => {
        void authLifecycleRegistry.invalidate(generation);
      },
    );
    const unregisterPrivateAtoms = authLifecycleRegistry.register({
      id: "private-jotai-state",
      clear: () => {
        appStore.set(expandedNodesAtom, []);
        appStore.set(libraryExpandedNodesAtom, []);
      },
    });
    startAuthBootstrap();
    return () => {
      unsubscribeIdentity();
      unregisterPrivateAtoms();
    };
  }, []);

  useEffect(() => {
    if (snapshot.status !== "authenticated" || !snapshot.user) return;
    void authLifecycleRegistry.restore({
      ownerId: snapshot.user.id,
      generation: snapshot.generation,
    });
  }, [snapshot.generation, snapshot.status, snapshot.user]);

  return <>{children}</>;
};

/**
 * 固定样式层叠与共享状态顺序，AntD 仅作为未迁移控件的兼容层。
 * @param props 业务应用子树。
 * @returns 带主题、查询、会话和弹层上下文的应用。
 */
const AppProvider = ({ children }: PropsWithChildren): ReactElement => {
  const theme = useMemo(getNubbiAntdTheme, []);

  return (
    <StyleProvider layer>
      <ConfigProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <Provider store={appStore}>
            <HydrateQueryClient>
              <AuthBootstrap>
                <UploadLifecycle />
                <ModalProvider>{children}</ModalProvider>
              </AuthBootstrap>
            </HydrateQueryClient>
          </Provider>
        </QueryClientProvider>
      </ConfigProvider>
    </StyleProvider>
  );
};

export default AppProvider;
