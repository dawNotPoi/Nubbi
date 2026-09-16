import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect } from "react";
import { ModalProvider } from "./component/UI/Dialog";
import UploadLifecycle from "./component/upload/UploadLifecycle";
import { restoreAuthSession } from "./utils/auth";
import { queryClient } from "./utils/queryClient";

const HydrateQueryClient = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  return children;
};

const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    void restoreAuthSession();
  }, []);

  return children;
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#6f7fe7",
          colorPrimaryHover: "#6373dc",
          colorPrimaryActive: "#5968cf",
          colorText: "#37352f",
          colorTextSecondary: "#787774",
          colorBorder: "#deddd9",
          colorBorderSecondary: "#ecebe8",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorFillSecondary: "#f2f2f0",
          colorFillTertiary: "#f7f7f5",
          borderRadius: 8,
          controlHeight: 36,
          controlHeightSM: 32,
          boxShadowSecondary: "0 10px 30px rgba(55, 53, 47, 0.08)",
        },
        components: {
          Button: {
            primaryShadow: "none",
            defaultShadow: "none",
            fontWeight: 500,
          },
          Dropdown: {
            paddingBlock: 6,
          },
          Input: {
            activeShadow: "0 0 0 2px #b9c3fb",
          },
          Select: {
            activeOutlineColor: "#b9c3fb",
          },
        },
      }}
    >
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
  );
};

export default AppProvider;
