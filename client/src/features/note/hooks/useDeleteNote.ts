import type { NotePathItem } from "@/api/note";
import { noteKeys } from "@/features/note/model/keys";
import type { DeleteNoteVariables } from "@/features/note/model/types";
import { deleteSingleNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { routes } from "@/utils/routes";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

type DeleteNoteCallbacks = {
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
};

type DeleteNoteAction = (
  variables: DeleteNoteVariables,
  callbacks?: DeleteNoteCallbacks,
) => void;

export const useDeleteNote = (): DeleteNoteAction => {
  const { Id: activeNoteId } = useParams();
  const { mutate } = useAtomValue(deleteSingleNoteAtom);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(
    (variables, callbacks) => {
      const ancestors = activeNoteId
        ? queryClient.getQueryData<NotePathItem[]>(
            noteKeys.ancestors(activeNoteId),
          )
        : undefined;
      const shouldReturnHome =
        activeNoteId === variables.noteId ||
        ancestors?.some((ancestor) => ancestor._id === variables.noteId);

      mutate(variables, {
        onError: (error) => {
          callbacks?.onError?.(error);
        },
        onSuccess: () => {
          callbacks?.onSuccess?.();
          if (shouldReturnHome) {
            navigate(routes.home, { replace: true });
          }
        },
      });
    },
    [activeNoteId, mutate, navigate, queryClient],
  );
};
