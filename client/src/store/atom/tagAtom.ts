import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { noteKeys } from "@/features/note/model/keys";
import { createTag, deleteTag, getTags } from "../../api/tag";
import { queryClient } from "../../utils/queryClient";
import {
  accountQueryKey,
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";

/** @param ownerId 当前账号 ID。@returns 当前账号的标签列表 key。 */
export const tagListQueryKey = (ownerId: string) =>
  accountQueryKey(ownerId, ["tags", "list"] as const);

/** 标签列表查询 atom，缓存 5 分钟 */
export const tagListAtom = atomWithQuery(() => {
  const scope = requireAccountScope();
  return {
  queryKey: tagListQueryKey(scope.ownerId),
  queryFn: async () => {
    const response = await getTags();
    return response.data || [];
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  };
});

/** 创建标签 mutation，成功后刷新标签列表 */
export const createTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => createTag(name),
  onMutate: () => ({ scope: requireAccountScope() }),
  onSuccess: (_response, _variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    queryClient.invalidateQueries({ queryKey: tagListQueryKey(context.scope.ownerId) });
  },
}));

/** 删除标签 mutation，成功后刷新标签列表和相关笔记缓存 */
export const deleteTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => deleteTag(name),
  onMutate: () => ({ scope: requireAccountScope() }),
  onSuccess: (_response, _variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    queryClient.invalidateQueries({ queryKey: tagListQueryKey(context.scope.ownerId) });
    queryClient.invalidateQueries({ queryKey: noteKeys.all(context.scope.ownerId) });
  },
}));
