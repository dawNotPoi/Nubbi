import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { noteKeys } from "@/features/note/model/keys";
import { createTag, deleteTag, getTags } from "../../api/tag";
import { queryClient } from "../../AppProvider";

export const tagListQueryKey = ["tags", "list"];

export const tagListAtom = atomWithQuery(() => ({
  queryKey: tagListQueryKey,
  queryFn: async () => {
    const response = await getTags();
    return response.data || [];
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
}));

export const createTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => createTag(name),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: tagListQueryKey });
  },
}));

export const deleteTagAtom = atomWithMutation(() => ({
  mutationFn: ({ name }: { name: string }) => deleteTag(name),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: tagListQueryKey });
    queryClient.invalidateQueries({ queryKey: noteKeys.all });
  },
}));
