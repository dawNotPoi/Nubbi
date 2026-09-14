import type { FileEntry, FolderEntry, RemoteFileRecord } from "./types";
import {
  isPrefixPath,
  joinPathParts,
  normalizePathLikeName,
  splitPathParts,
} from "./path";

export function deriveEntriesForDir(
  files: RemoteFileRecord[],
  currentDirParts: string[]
) {
  const folders = new Map<string, { name: string; count: number }>();
  const fileEntries: FileEntry[] = [];

  for (const file of files) {
    const normalizedName = normalizePathLikeName(file.name);
    const fullParts = splitPathParts(normalizedName);
    const fileDirParts = fullParts.slice(0, -1);

    if (!isPrefixPath(currentDirParts, fileDirParts)) continue;

    const restDirParts = fileDirParts.slice(currentDirParts.length);
    if (restDirParts.length === 0) {
      fileEntries.push({
        kind: "file",
        file,
        baseName: fullParts[fullParts.length - 1] ?? normalizedName,
        dirParts: fileDirParts,
        fullName: joinPathParts(fullParts),
      });
      continue;
    }

    const folderName = restDirParts[0]!;
    const existing = folders.get(folderName);
    if (!existing) folders.set(folderName, { name: folderName, count: 1 });
    else folders.set(folderName, { ...existing, count: existing.count + 1 });
  }

  const folderEntries: FolderEntry[] = Array.from(folders.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({
      kind: "folder" as const,
      name: folder.name,
      pathParts: [...currentDirParts, folder.name],
      fileCount: folder.count,
    }));

  const sortedFiles = fileEntries.sort((a, b) =>
    a.baseName.localeCompare(b.baseName)
  );

  return { folders: folderEntries, files: sortedFiles };
}

