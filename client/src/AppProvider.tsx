import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect } from "react";
import { ModalProvider } from "./component/UI/Dialog";
import { restoreAuthSession } from "./utils/auth";

export const queryClient = new QueryClient();

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

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <HydrateQueryClient>
          <AuthBootstrap>
            <ModalProvider>{children}</ModalProvider>
          </AuthBootstrap>
        </HydrateQueryClient>
      </Provider>
    </QueryClientProvider>
  );
};
