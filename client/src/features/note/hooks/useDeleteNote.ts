import type { NotePathItem } from "@/api/note";
import { noteKeys } from "@/features/note/model/keys";
import type { DeleteNoteVariables } from "@/features/note/model/types";
import { deleteSingleNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { routes } from "@/utils/routes";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  isAccountScopeCurrent,
  requireAccountScope,
  requireOwnerId,
} from "@/features/auth/model/account-scope";

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
  const { user } = useAuth();
  const ownerId = requireOwnerId(user?.id);

  return useCallback(
    (variables, callbacks) => {
      const scope = requireAccountScope();
      const ancestors = activeNoteId
        ? queryClient.getQueryData<NotePathItem[]>(
            noteKeys.ancestors(ownerId, activeNoteId),
          )
        : undefined;
      const shouldReturnHome =
        activeNoteId === variables.noteId ||
        ancestors?.some((ancestor) => ancestor._id === variables.noteId);

      mutate(variables, {
        onError: (error) => {
          if (!isAccountScopeCurrent(scope)) return;
          callbacks?.onError?.(error);
        },
        onSuccess: () => {
          if (!isAccountScopeCurrent(scope)) return;
          callbacks?.onSuccess?.();
          if (!isAccountScopeCurrent(scope)) return;
          if (shouldReturnHome) {
            navigate(routes.home, { replace: true });
          }
        },
      });
    },
    [activeNoteId, mutate, navigate, ownerId, queryClient],
  );
};
