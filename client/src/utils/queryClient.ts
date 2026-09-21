import { QueryClient } from "@tanstack/react-query";
import { authLifecycleRegistry } from "@/features/auth/model/auth-lifecycle";

/** 应用唯一 TanStack Query 客户端。 */
export const queryClient = new QueryClient();

authLifecycleRegistry.register({
  id: "query-client",
  cancel: () => queryClient.cancelQueries(),
  clear: () => queryClient.clear(),
});
