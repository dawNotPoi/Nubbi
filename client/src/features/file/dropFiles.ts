/** 单次拖拽允许收集的最大文件数，防止拖入超大目录时阻塞页面 */
export const MAX_DROPPED_FILES = 100;

/** 读取目录 reader 的一批子条目 */
const readDirectoryBatch = (
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });

/** 把单个 FileSystemEntry 递归收集为 File 列表 */
const collectEntry = async (
  entry: FileSystemEntry,
  files: File[],
): Promise<void> => {
  if (files.length >= MAX_DROPPED_FILES) return;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    if (files.length < MAX_DROPPED_FILES) files.push(file);
    return;
  }
  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  while (files.length < MAX_DROPPED_FILES) {
    const batch = await readDirectoryBatch(reader);
    if (batch.length === 0) break;
    for (const child of batch) {
      await collectEntry(child, files);
      if (files.length >= MAX_DROPPED_FILES) break;
    }
  }
};

/**
 * 把拖拽数据整理成待上传文件列表，支持拖入文件夹并递归展开。
 * 浏览器不支持目录解析时回退到普通文件列表。
 * @param dataTransfer 拖拽事件携带的数据。
 * @returns 收集到的文件列表，最多 `MAX_DROPPED_FILES` 个。
 */
export const collectDroppedFiles = async (
  dataTransfer: DataTransfer,
): Promise<File[]> => {
  const entries = Array.from(dataTransfer.items ?? [])
    .map((item) =>
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null,
    )
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (entries.length === 0) {
    return Array.from(dataTransfer.files ?? []).slice(0, MAX_DROPPED_FILES);
  }

  const files: File[] = [];
  for (const entry of entries) {
    await collectEntry(entry, files);
    if (files.length >= MAX_DROPPED_FILES) break;
  }
  return files;
};

/** 判断拖拽数据中是否包含本地文件（用于区分移动拖拽和上传拖拽） */
export const hasDraggedFiles = (dataTransfer: DataTransfer): boolean =>
  Array.from(dataTransfer.types ?? []).includes("Files");
