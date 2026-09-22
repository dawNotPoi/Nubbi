import type { FileListItem, FolderRecord } from "@/api/file";
export type FolderTreeNode = {
  key: string;
  title: string;
  children?: FolderTreeNode[];
  targetDisabled?: boolean;
  selectable?: boolean;
};

export const collectDisabledFolderIds = (
  folders: FolderRecord[],
  targets: FileListItem[],
) => {
  const childrenByParent = new Map<string, string[]>();
  folders.forEach((folder) => {
    const parentId = folder.parentId ? String(folder.parentId) : "root";
    childrenByParent.set(parentId, [
      ...(childrenByParent.get(parentId) ?? []),
      String(folder._id),
    ]);
  });

  const disabled = new Set(
    targets.flatMap((item) => (item.kind === "folder" ? [item._id] : [])),
  );
  const queue = [...disabled];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    (childrenByParent.get(current) ?? []).forEach((child) => {
      if (disabled.has(child)) return;
      disabled.add(child);
      queue.push(child);
    });
  }
  return disabled;
};

export const buildFolderTree = (
  folders: FolderRecord[],
  disabled: Set<string>,
) => {
  const nodes = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];
  folders.forEach((folder) => {
    const id = String(folder._id);
    nodes.set(id, {
      key: id,
      title: folder.name || "未命名文件夹",
      children: [],
      targetDisabled: disabled.has(id),
      selectable: !disabled.has(id),
    });
  });
  folders.forEach((folder) => {
    const node = nodes.get(String(folder._id));
    if (!node) return;
    const parent = folder.parentId ? nodes.get(String(folder.parentId)) : null;
    if (parent) parent.children?.push(node);
    else roots.push(node);
  });
  return roots;
};
