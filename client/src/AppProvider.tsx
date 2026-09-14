import { QueryClient } from "@tanstack/react-query";
import { Provider } from "jotai";
import { ModalProvider } from "./component/UI/Dialog";

export const queryClient = new QueryClient();
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider>
      <ModalProvider>{children}</ModalProvider>
    </Provider>
  );
};
