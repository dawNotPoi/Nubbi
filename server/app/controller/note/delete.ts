import note from "@/models/note";

// 删除笔记（递归删除子笔记）
export const deleteNote = async (noteId) => {
  // 递归删除所有子笔记
  const deleteChildren = async (parentId: string) => {
    const children = await note.find({ parentId: parentId });

    for (const child of children) {
      // 递归删除子笔记的子笔记
      await deleteChildren(child._id.toString());
      // 删除当前子笔记
      await note.findByIdAndDelete(child._id);
    }
  };
  // 先删除所有子笔记
  await deleteChildren(noteId);
  // 再删除当前笔记
  const deletedNote = await note.findByIdAndDelete(noteId);
  return deletedNote;
};

// 批量删除笔记（递归删除子笔记）- 支持单个ID和多个ID
// export const deleteNotes = async (noteIds: string | string[]) => {
//   // 统一转换为数组
//   const ids = Array.isArray(noteIds) ? noteIds : [noteIds];

//   const deletedNotes: any[] = [];

//   for (const noteId of ids) {
//     try {
//       const deletedNote = await deleteNote(noteId);
//       if (deletedNote) {
//         deletedNotes.push(deletedNote);
//       }
//     } catch (error) {
//       console.error(`删除笔记 ${noteId} 失败:`, error);
//       // 继续删除其他笔记，不中断整个批量操作
//     }
//   }

//   return deletedNotes;
// };
