import { atomWithMutation } from "jotai-tanstack-query";
import {
  isAccountScopeCurrent,
  requireAccountScope,
  type AccountScope,
} from "@/features/auth/model/account-scope";
import {
  applyOptimisticNoteContentUpdate,
  applySuccessfulNoteContentUpdate,
  patchNoteAcrossCaches,
  patchNoteDetailCache,
  replaceNoteInTreeCache,
} from "@/features/note/model/cache";
import { noteKeys } from "@/features/note/model/keys";
import {
  applyOptimisticNotePropertiesUpdate,
  optimisticPrependNoteToList,
  optimisticRemoveNoteFromList,
  rollbackNoteListSnapshot,
  rollbackOptimisticNotePropertiesUpdate,
} from "@/features/note/model/optimisticCache";
import type {
  CreateNoteVariables,
  DeleteNoteVariables,
  UpdateNoteContentVariables,
  UpdateNotePropertiesVariables,
} from "@/features/note/model/types";
import {
  createNote,
  deleteNote,
  publishNote,
  updateNoteContent,
  updateNoteProperties,
} from "../../../api/note";
import { queryClient } from "../../../utils/queryClient";

/** 统一失效树列表、全部列表和最近编辑三处缓存 */
const invalidateTreeLists = (scope: AccountScope): void => {
  queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot(scope.ownerId) });
  queryClient.invalidateQueries({ queryKey: noteKeys.allLists(scope.ownerId) });
  queryClient.invalidateQueries({ queryKey: noteKeys.recent(scope.ownerId) });
};

/**
 * 创建笔记 mutation。
 * onMutate 乐观插入树列表，成功后替换占位笔记并刷新列表，失败回滚快照。
 */
export const createNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ note }: CreateNoteVariables) => createNote(note),
  onMutate: async ({ note }) => {
    const scope = requireAccountScope();
    const snapshot = await optimisticPrependNoteToList(
      queryClient,
      scope,
      note,
    );
    return { scope, snapshot };
  },
  onError: (error, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    rollbackNoteListSnapshot(queryClient, context.snapshot);
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.detail(context.scope.ownerId, variables.note._id),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.ancestors(context.scope.ownerId, variables.note._id),
    });
    invalidateTreeLists(context.scope);
    console.error("create Note error", error);
  },
  onSuccess: (response, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    const nextNote = response.data || variables.note;
    replaceNoteInTreeCache(
      queryClient,
      context.scope.ownerId,
      nextNote.parentId ?? null,
      nextNote,
    );
    queryClient.setQueryData(noteKeys.detail(context.scope.ownerId, variables.note._id), {
      ...variables.note,
      ...response.data,
    });
    invalidateTreeLists(context.scope);
  },
}));

/**
 * 删除单篇笔记 mutation。
 * onMutate 乐观从树列表移除，成功后清理 detail/ancestors/tree 缓存。
 */
export const deleteSingleNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId }: DeleteNoteVariables) => deleteNote(noteId),
  onMutate: async ({ noteId, parentId }) => {
    const scope = requireAccountScope();
    const snapshot = await optimisticRemoveNoteFromList(
      queryClient,
      scope,
      parentId,
      noteId,
    );
    return { scope, snapshot };
  },
  onError: (error, _variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    rollbackNoteListSnapshot(queryClient, context.snapshot);
    queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot(context.scope.ownerId) });
    console.error("delete Note error", error);
  },
  onSuccess: (_data, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    const ownerId = context.scope.ownerId;
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.detail(ownerId, variables.noteId),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.ancestors(ownerId, variables.noteId),
    });
    queryClient.removeQueries({
      exact: true,
      queryKey: noteKeys.tree(ownerId, variables.noteId),
    });
    invalidateTreeLists(context.scope);
    queryClient.invalidateQueries({ queryKey: noteKeys.ancestorsRoot(ownerId) });
    queryClient.invalidateQueries({
      queryKey: [...noteKeys.lists(ownerId), "trash"],
    });
  },
}));

/** 发布/取消发布笔记 mutation，成功后 patch 详情缓存 */
export const publishNoteAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, published }: { noteId: string; published: boolean }) =>
    publishNote(noteId, published),
  onMutate: () => ({ scope: requireAccountScope() }),
  onSuccess: (response, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    if (response.data) {
      patchNoteDetailCache(
        queryClient,
        context.scope.ownerId,
        variables.noteId,
        response.data,
      );
    }
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists(context.scope.ownerId) });
    queryClient.invalidateQueries({ queryKey: noteKeys.recent(context.scope.ownerId) });
  },
}));

/**
 * 更新笔记正文 mutation。
 * onMutate 乐观更新 updatedAt，成功后用服务端返回结果修正详情。
 */
export const updateNoteContentAtom = atomWithMutation(() => ({
  mutationFn: ({
    baseContentRevision,
    clientMutationId,
    content,
    noteId,
  }: UpdateNoteContentVariables) =>
    updateNoteContent(noteId, {
      baseContentRevision,
      clientMutationId,
      content,
    }),
  onMutate: async ({ noteId }) => {
    const scope = requireAccountScope();
    await applyOptimisticNoteContentUpdate(queryClient, scope, noteId);
    return { scope };
  },
  onError: (error, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists(context.scope.ownerId) });
    queryClient.invalidateQueries({
      queryKey: noteKeys.detail(context.scope.ownerId, variables.noteId),
    });
    console.error("update Note content error", error);
  },
  onSuccess: (response, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    applySuccessfulNoteContentUpdate(
      queryClient,
      context.scope.ownerId,
      variables.noteId,
      response.data,
    );
  },
}));

/**
 * 更新笔记属性 mutation。
 * onMutate 处理父节点移动的双列表快照，失败精确回滚。
 */
export const updateNotePropertiesAtom = atomWithMutation(() => ({
  mutationFn: ({ noteId, properties }: UpdateNotePropertiesVariables) =>
    updateNoteProperties(noteId, properties),
  onMutate: async (variables) => {
    const scope = requireAccountScope();
    const snapshot = await applyOptimisticNotePropertiesUpdate(
      queryClient,
      scope,
      variables,
    );
    return { scope, snapshot };
  },
  onError: (error, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    rollbackOptimisticNotePropertiesUpdate(
      queryClient,
      context.scope.ownerId,
      variables.noteId,
      context.snapshot,
    );
    queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot(context.scope.ownerId) });
    queryClient.invalidateQueries({
      queryKey: noteKeys.detail(context.scope.ownerId, variables.noteId),
    });
    console.error("update Note properties error", error);
  },
  onSuccess: (response, variables, context) => {
    if (!context || !isAccountScopeCurrent(context.scope)) return;
    const ownerId = context.scope.ownerId;
    if (response.data) {
      patchNoteAcrossCaches(
        queryClient,
        ownerId,
        context.snapshot.nextParentId ?? variables.parentId,
        variables.noteId,
        response.data,
      );
    }
    if (Object.prototype.hasOwnProperty.call(variables.properties, "parentId")) {
      queryClient.invalidateQueries({ queryKey: noteKeys.treeRoot(ownerId) });
    }
    queryClient.invalidateQueries({ queryKey: noteKeys.allLists(ownerId) });
    queryClient.invalidateQueries({ queryKey: noteKeys.recent(ownerId) });
    queryClient.invalidateQueries({ queryKey: noteKeys.ancestorsRoot(ownerId) });
  },
}));
