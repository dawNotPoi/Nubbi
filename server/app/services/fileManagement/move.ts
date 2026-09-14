import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import type { MoveBatchInput, MoveFileInput, MoveTarget } from "./schemas";
import { withFileFolderStructureLock } from "./structureLock";
import {
  isInvalidFolderTarget,
  type FolderGraph,
} from "./moveGraph";

type MoveKind = MoveTarget["kind"];

export type MovedItem = MoveTarget & { targetFolderId: string | null };
export type UnmovedItem = MoveTarget & { reason: string };

type InternalOutcome =
  | { state: "moved"; item: MovedItem }
  | { state: "skipped"; item: UnmovedItem }
  | { state: "failed"; item: UnmovedItem; status: number };

const httpError = (status: number, message: string): Error =>
  Object.assign(new Error(message), { status });

const sameFolder = (current: unknown, target: string | null): boolean =>
  (current ? String(current) : null) === target;

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

const validateDestination = (
  targetFolderId: string | null,
  graph: FolderGraph,
): void => {
  if (targetFolderId && !graph.has(targetFolderId)) {
    throw httpError(404, "目标文件夹不存在或无权访问");
  }
};

const failed = (
  target: MoveTarget,
  reason: string,
  status: number,
): InternalOutcome => ({ state: "failed", item: { ...target, reason }, status });

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

const moveOne = (
  ownerId: string,
  target: MoveTarget,
  targetFolderId: string | null,
  graph: FolderGraph,
): Promise<InternalOutcome> =>
  target.kind === "folder"
    ? moveFolder(ownerId, target, targetFolderId, graph)
    : moveFile(ownerId, target, targetFolderId);

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

export const moveFileItem = (ownerId: string, input: MoveFileInput) =>
  withFileFolderStructureLock(ownerId, () =>
    moveFileItemUnlocked(ownerId, input),
  );

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

export const moveFileBatch = (ownerId: string, input: MoveBatchInput) =>
  withFileFolderStructureLock(ownerId, () =>
    moveFileBatchUnlocked(ownerId, input),
  );
