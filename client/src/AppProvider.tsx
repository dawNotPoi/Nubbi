import { StyleProvider } from "@ant-design/cssinjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect, useMemo, type PropsWithChildren, type ReactElement } from "react";
import { ModalProvider } from "./component/UI/Dialog";
import UploadLifecycle from "./component/upload/UploadLifecycle";
import { getNubbiAntdTheme } from "./styles/antd-theme";
import { restoreAuthSession } from "./utils/auth";
import { queryClient } from "./utils/queryClient";

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
 * 恢复会话；UI 迁移不改变认证与路由守卫的原有职责。
 * @param props 应用子树。
 * @returns 原样传递的子树。
 */
const AuthBootstrap = ({ children }: PropsWithChildren): ReactElement => {
  useEffect(() => {
    void restoreAuthSession();
  }, []);
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
          <Provider>
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
