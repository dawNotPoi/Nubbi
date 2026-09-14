import post from "@/models/post";

// 更新文章
export const updatePost = async (req) => {
  return post
    .findByIdAndUpdate(req._id, {
      $set: { ...req.config },
    }, { new: true })
    .then((data) => {
      return data;
    });
};

// 更新文章内容
export const updatePostContent = async (postId: string, content: string) => {
  return await post.findByIdAndUpdate(
    postId,
    { 
      $set: { 
        content
      }
    },
    { new: true }
  );
};

// 更新文章属性（除内容外的所有属性）
export const updatePostMeta = async (postId: string, properties: any) => {
  return await post.findByIdAndUpdate(
    postId,
    { 
      $set: { 
        ...properties,
      }
    },
    { new: true }
  );
};

// 增加观看次数
export const addWatchs = async (id: string) => {
  return await post.findByIdAndUpdate(id, { $inc: { watched: 1 } });
}

// 增加点赞数
export const addLikes = async (id: string) => {
  return await post.findByIdAndUpdate(id, { $inc: { like: 1 } });
}

// 移动文章到新的父级
export const movePost = async (postId: string, newParentId: string) => {
  return await post.findByIdAndUpdate(
    postId,
    { 
      parentId: newParentId
    },
    { new: true }
  );
};


