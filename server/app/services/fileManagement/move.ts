import { httpError } from "@/common/http-error";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import type {
  MoveBatchInput,
  MoveFileInput,
  MoveTarget,
} from "./input-types";
import { withFileFolderStructureLock } from "./structureLock";
import {
  isInvalidFolderTarget,
  type FolderGraph,
} from "./moveGraph";

/** 移动项的类型 */
type MoveKind = MoveTarget["kind"];

export type MovedItem = MoveTarget & { targetFolderId: string | null };
export type UnmovedItem = MoveTarget & { reason: string };
export type MoveBatchResult = {
  moved: MovedItem[];
  skipped: UnmovedItem[];
  failed: UnmovedItem[];
};

/** 移动单项的内部结果 */
type InternalOutcome =
  | { state: "moved"; item: MovedItem }
  | { state: "skipped"; item: UnmovedItem }
  | { state: "failed"; item: UnmovedItem; status: number };

/** 判断当前父级是否已是目标目录 */
const sameFolder = (current: unknown, target: string | null): boolean =>
  (current ? String(current) : null) === target;

/** 加载用户的文件夹层级图，用于环路检测 */
const loadFolderGraph = async (ownerId: string): Promise<FolderGraph> => {
  const folders = await Folder.find({ ownerId })
    .select("_id parentId")
    .lean();
  return new Map(
    folders.map((folder) => [
      String(folder._id),
      folder.parentId ? String(folder.parentId) : null,
    ]),
  );
};

/** 校验目标文件夹存在且属于当前用户 */
const validateDestination = (
  targetFolderId: string | null,
  graph: FolderGraph,
): void => {
  if (targetFolderId && !graph.has(targetFolderId)) {
    throw httpError(404, "目标文件夹不存在或无权访问");
  }
};

/** 构造失败结果 */
const failed = (
  target: MoveTarget,
  reason: string,
  status: number,
): InternalOutcome => ({ state: "failed", item: { ...target, reason }, status });

/** 移动单个文件：校验归属和状态，更新 folderId */
const moveFile = async (
  ownerId: string,
  target: MoveTarget,
  targetFolderId: string | null,
): Promise<InternalOutcome> => {
  const file = await File.findOne({
    _id: target.id,
    ownerId,
    status: "active",
  })
    .select("_id folderId")
    .lean();
  if (!file) return failed(target, "文件不存在或无权操作", 404);
  if (sameFolder(file.folderId, targetFolderId)) {
    return { state: "skipped", item: { ...target, reason: "已在目标目录" } };
  }

  const result = await File.updateOne(
    { _id: target.id, ownerId, status: "active" },
    { $set: { folderId: targetFolderId } },
  );
  if (result.matchedCount === 0) {
    return failed(target, "文件不存在或无权操作", 404);
  }
  return { state: "moved", item: { ...target, targetFolderId } };
};

/** 移动单个文件夹：校验环路（不能移入自身或后代），更新 parentId */
const moveFolder = async (
  ownerId: string,
  target: MoveTarget,
  targetFolderId: string | null,
  graph: FolderGraph,
): Promise<InternalOutcome> => {
  if (!graph.has(target.id)) {
    return failed(target, "文件夹不存在或无权操作", 404);
  }
  if (isInvalidFolderTarget(target.id, targetFolderId, graph)) {
    return failed(target, "不能移动到自身或其子文件夹中", 400);
  }
  if (graph.get(target.id) === targetFolderId) {
    return { state: "skipped", item: { ...target, reason: "已在目标目录" } };
  }

  const result = await Folder.updateOne(
    { _id: target.id, ownerId },
    { $set: { parentId: targetFolderId } },
  );
  if (result.matchedCount === 0) {
    return failed(target, "文件夹不存在或无权操作", 404);
  }
  graph.set(target.id, targetFolderId);
  return { state: "moved", item: { ...target, targetFolderId } };
};

/** 按目标类型分发移动操作 */
const moveOne = (
  ownerId: string,
  target: MoveTarget,
  targetFolderId: string | null,
  graph: FolderGraph,
): Promise<InternalOutcome> =>
  target.kind === "folder"
    ? moveFolder(ownerId, target, targetFolderId, graph)
    : moveFile(ownerId, target, targetFolderId);

/** 单文件移动（无锁版，供已持锁调用方使用） */
const moveFileItemUnlocked = async (ownerId: string, input: MoveFileInput) => {
  const graph = await loadFolderGraph(ownerId);
  validateDestination(input.targetFolderId, graph);
  const outcome = await moveOne(
    ownerId,
    { id: input._id, kind: input.kind },
    input.targetFolderId,
    graph,
  );
  if (outcome.state === "failed") {
    throw httpError(outcome.status, outcome.item.reason);
  }
  return outcome.item;
};

/** 移动单个文件/文件夹（带目录结构锁） */
export const moveFileItem = (
  ownerId: string,
  input: MoveFileInput,
): Promise<MovedItem | UnmovedItem> =>
  withFileFolderStructureLock(ownerId, () =>
    moveFileItemUnlocked(ownerId, input),
  );

/** 批量移动（无锁版）：逐项移动并汇总结果，跳过重复项 */
const moveFileBatchUnlocked = async (
  ownerId: string,
  input: MoveBatchInput,
) => {
  const graph = await loadFolderGraph(ownerId);
  validateDestination(input.targetFolderId, graph);
  const moved: MovedItem[] = [];
  const skipped: UnmovedItem[] = [];
  const failedItems: UnmovedItem[] = [];
  const seen = new Set<string>();

  for (const target of input.targets) {
    const key = `${target.kind}:${target.id}`;
    if (seen.has(key)) {
      skipped.push({ ...target, reason: "重复对象" });
      continue;
    }
    seen.add(key);
    try {
      const outcome = await moveOne(ownerId, target, input.targetFolderId, graph);
      if (outcome.state === "moved") moved.push(outcome.item);
      else if (outcome.state === "skipped") skipped.push(outcome.item);
      else failedItems.push(outcome.item);
    } catch {
      failedItems.push({ ...target, reason: "移动失败" });
    }
  }

  return { moved, skipped, failed: failedItems };
};

/** 批量移动文件/文件夹（带目录结构锁） */
export const moveFileBatch = (
  ownerId: string,
  input: MoveBatchInput,
): Promise<MoveBatchResult> =>
  withFileFolderStructureLock(ownerId, () =>
    moveFileBatchUnlocked(ownerId, input),
  );
