import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { noteKeys } from "@/features/note/model/keys";
import { createTag, deleteTag, getTags } from "../../api/tag";
import { queryClient } from "../../utils/queryClient";

/** 标签列表 query key，供列表查询和缓存失效共用 */
export const tagListQueryKey = ["tags", "list"];

/** 标签列表查询 atom，缓存 5 分钟 */
export const tagListAtom = atomWithQuery(() => ({
  queryKey: tagListQueryKey,
  queryFn: async () => {
    const response = await getTags();
    return response.data || [];
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
}));

/** 创建标签 mutation，成功后刷新标签列表 */
export const createTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => createTag(name),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: tagListQueryKey });
  },
}));

/** 删除标签 mutation，成功后刷新标签列表和相关笔记缓存 */
export const deleteTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => deleteTag(name),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: tagListQueryKey });
    queryClient.invalidateQueries({ queryKey: noteKeys.all });
  },
}));
