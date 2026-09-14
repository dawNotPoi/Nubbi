import { getDirectChildren, getRootNotes } from "@/api/note";
import { noteKeys } from "@/features/note/model/keys";
import { useQuery } from "@tanstack/react-query";

type UseNoteTreeQueryOptions = {
  enabled?: boolean;
};

export const useNoteTreeQuery = (
  parentId: string | null,
  { enabled = true }: UseNoteTreeQueryOptions = {},
) =>
  useQuery({
    queryKey: noteKeys.tree(parentId),
    queryFn: async () => {
      const response = parentId
        ? await getDirectChildren(parentId)
        : await getRootNotes();
      return response.data ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
