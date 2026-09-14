import post from "@/models/post";
import mongoose from "mongoose";

const stripSummaryFromMeta = <T extends { meta?: unknown }>(value: T): T => {
  if (!value.meta || typeof value.meta !== "object" || Array.isArray(value.meta)) {
    return value;
  }

  const { summary: _summary, ...meta } = value.meta as Record<string, unknown>;
  return { ...value, meta };
};

export const createPost = async (req) => {
  const postData = stripSummaryFromMeta({ ...req });
  if (postData._id) {
    try {
      postData._id = new mongoose.mongo.ObjectId("" + postData._id);
    } catch (e) {
      delete postData._id;
    }
  }
  return post.create(postData).then((data) => {
    return data;
  });
};

export const duplicatePost = async (postId: string, newParentId = null) => {
  const originalPost = await post.findById(postId);
  if (!originalPost) {
    throw new Error("Post not found");
  }

  const duplicatedPost = stripSummaryFromMeta({
    ...originalPost.toObject(),
    _id: undefined,
    title: `${originalPost.title} (copy)`,
    parentId: newParentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  delete duplicatedPost._id;
  return await post.create(duplicatedPost);
};
