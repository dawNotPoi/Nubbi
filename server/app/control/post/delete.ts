import post from "@/models/post";

// 删除文章（递归删除子文章）
export const deletePost = async (postId) => {
  // 递归删除所有子文章
  const deleteChildren = async (parentId: string) => {
    const children = await post.find({ parentId: parentId });

    for (const child of children) {
      // 递归删除子文章的子文章
      await deleteChildren(child._id.toString());
      // 删除当前子文章
      await post.findByIdAndDelete(child._id);
    }
  };
  // 先删除所有子文章
  await deleteChildren(postId);
  // 再删除当前文章
  const deletedPost = await post.findByIdAndDelete(postId);
  return deletedPost;
};

// 批量删除文章（递归删除子文章）- 支持单个ID和多个ID
// export const deletePosts = async (postIds: string | string[]) => {
//   // 统一转换为数组
//   const ids = Array.isArray(postIds) ? postIds : [postIds];

//   const deletedPosts: any[] = [];

//   for (const postId of ids) {
//     try {
//       const deletedPost = await deletePost(postId);
//       if (deletedPost) {
//         deletedPosts.push(deletedPost);
//       }
//     } catch (error) {
//       console.error(`删除文章 ${postId} 失败:`, error);
//       // 继续删除其他文章，不中断整个批量操作
//     }
//   }

//   return deletedPosts;
// };
