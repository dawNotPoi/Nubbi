import post from "@/models/post";
import mongoose from "mongoose";


// 创建文章
export const createPost = async (req) => {
  const postData = { ...req };
  if (postData._id) {
    try {
      postData._id = new mongoose.mongo.ObjectId('' + postData._id);
    } catch (e) {
      delete postData._id; // 转换失败则让 MongoDB 自动生成
    }
  }
  return post.create(postData).then((data) => {
    return data;
  });
};

// 复制文章
export const duplicatePost = async (postId: string, newParentId = null) => {
  const originalPost = await post.findById(postId);
  if (!originalPost) {
    throw new Error('文章不存在');
  }

  const duplicatedPost = {
    ...originalPost.toObject(),
    _id: undefined, // 让MongoDB生成新的ID
    title: `${originalPost.title} (副本)`,
    parentId: newParentId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  delete duplicatedPost._id;
  return await post.create(duplicatedPost);
}; 