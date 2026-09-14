import post from "@/models/post";

// 根据ID获取文章（不增加观看次数）
export const getPostById = async (id: string) => {
  return await post.findById(id);
};

// 获取文章的直接子文章
export const getDirectChildren = async (parentId: string) => {
  return await post
    .find({ parentId: parentId })
    .sort({ createdAt: -1 })
    .select("-content"); // 不返回内容，只返回元数据
};

// 获取文章的所有子文章（递归）
export const getAllChildren = async (parentId: string) => {
  const children = await post
    .find({ parentId: parentId })
    .sort({ createdAt: -1 });
  // 递归获取每个子文章的子文章
  const allChildren: any[] = [];
  for (const child of children) {
    allChildren.push(child);
    const grandChildren = await getAllChildren(child._id.toString());
    allChildren.push(...grandChildren);
  }

  return allChildren;
};

// 获取根级文章（没有父级的文章）
export const getRootPosts = async (userId: string) => {
  return await post
    .find({ parentId: null, userId })
    .sort({ createdAt: -1 })
    .select("-content");
};

// 根据标签查询文章
export const findPostsByTags = async (tags: string[]) => {
  return await post
    .find({
      tags: { $in: tags },
    })
    .sort({ createdAt: -1 });
};

// 根据状态查询文章
export const findPostsByStatus = async (status: string) => {
  return await post.find({ status }).sort({ createdAt: -1 });
};

// 获取文章统计信息
export const getPostStats = async () => {
  const total = await post.countDocuments();
  const published = await post.countDocuments({ status: "Published" });
  const draft = await post.countDocuments({ status: "Draft" });
  const archived = await post.countDocuments({ status: "Archived" });

  return {
    total,
    published,
    draft,
    archived,
  };
};

// 获取标签统计信息（每个标签的文章数量）
export const getTagStats = async () => {
  const posts = await post.find({}, "tags");
  const tagCount: { [key: string]: number } = {};
  posts.forEach((post) => {
    if (post.meta.tags && Array.isArray(post.meta.tags)) {
      post.meta.tags.forEach((tag) => {
        if (tag && tag.trim()) {
          const cleanTag = tag.trim();
          tagCount[cleanTag] = (tagCount[cleanTag] || 0) + 1;
        }
      });
    }
  });

  // 转换为数组格式，按文章数量降序排列
  const tagStats = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return tagStats;
};

export const getPosts = async (userId: string) => {
  return await post.find({
    userId: userId,
    $or: [{ children: { $exists: false } }, { children: { $size: 0 } }],
  });
};

export const getRencentPosts = async (userId: string) => {
  return await post
    .find({
      userId: userId,
      $or: [{ children: { $exists: false } }, { children: { $size: 0 } }],
    })
    .sort({ updatedAt: -1 });
};

export const validatePostUser = async (userId: string, postId: string) => {
  const Result = await post.findById(postId);
  if (Result?.userId === userId) return true;
  else return false;
};

export const searchPosts = async (userId: string, title: string) => {
  const result = await post
    .find({
      userId: userId,
      title: { $regex: title, $options: "i" },
    })
    .lean();

  const postCache = new Map<string, { title: string; parentId?: string | null }>();

  const getParentInfo = async (postId: string) => {
    if (postCache.has(postId)) {
      return postCache.get(postId)!;
    }

    const parentPost = await post.findById(postId).select("title parentId").lean();
    const parentInfo = {
      title: parentPost?.title || "未命名文档",
      parentId: parentPost?.parentId ? String(parentPost.parentId) : null,
    };
    postCache.set(postId, parentInfo);
    return parentInfo;
  };

  const buildPathLabel = async (parentId?: any) => {
    if (!parentId) return "";

    const titles: string[] = [];
    let currentParentId: string | null = String(parentId);

    while (currentParentId) {
      const parentInfo = await getParentInfo(currentParentId);
      titles.unshift(parentInfo.title);
      currentParentId = parentInfo.parentId ?? null;
    }

    if (titles.length === 0) return "";
    if (titles.length <= 2) {
      return titles.join("/");
    }
    return [titles[0], "...", titles[titles.length - 1]].join("/");
  };

  return Promise.all(
    result.map(async (item) => ({
      ...item,
      pathLabel: await buildPathLabel(item.parentId),
    })),
  );
};
