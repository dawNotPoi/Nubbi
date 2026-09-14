import post from "@/models/post";

const stripSummaryFromProperties = <T extends { meta?: unknown }>(value: T): T => {
  if (!value.meta || typeof value.meta !== "object" || Array.isArray(value.meta)) {
    return value;
  }

  const { summary: _summary, ...meta } = value.meta as Record<string, unknown>;
  return { ...value, meta };
};

export const updatePost = async (req) => {
  return post
    .findByIdAndUpdate(
      req._id,
      {
        $set: { ...stripSummaryFromProperties(req.config) },
      },
      { new: true },
    )
    .then((data) => {
      return data;
    });
};

export const updatePostContent = async (postId: string, content: string) => {
  return await post.findByIdAndUpdate(
    postId,
    {
      $set: {
        content,
      },
    },
    { new: true },
  );
};

export const updatePostMeta = async (postId: string, properties: any) => {
  const nextProperties = stripSummaryFromProperties(properties);

  return await post.findByIdAndUpdate(
    postId,
    {
      $set: {
        ...nextProperties,
      },
    },
    { new: true },
  );
};

export const addWatchs = async (id: string) => {
  return await post.findByIdAndUpdate(id, { $inc: { watched: 1 } });
};

export const addLikes = async (id: string) => {
  return await post.findByIdAndUpdate(id, { $inc: { like: 1 } });
};

export const movePost = async (postId: string, newParentId: string) => {
  return await post.findByIdAndUpdate(
    postId,
    {
      parentId: newParentId,
    },
    { new: true },
  );
};
