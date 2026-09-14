import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { useHydrateAtoms } from "jotai/utils";
import { ModalProvider } from "./component/UI/Dialog";

export const queryClient = new QueryClient();

const HydrateQueryClient = ({ children }: { children: React.ReactNode }) => {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  return children;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <HydrateQueryClient>
          <ModalProvider>{children}</ModalProvider>
        </HydrateQueryClient>
      </Provider>
    </QueryClientProvider>
  );
};
