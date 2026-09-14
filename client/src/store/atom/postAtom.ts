import { atom } from "jotai";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { atomFamily, atomWithStorage } from "jotai/utils";
import {
  createPost,
  deletePost,
  getDirectChildren,
  getPostDetail,
  getRencentPosts,
  getRootPosts,
  Post,
  PostWithContent,
  updatePostContent,
  updatePostProperties,
} from "../../api/post";
import { queryClient } from "../../AppProvider";

type PostPropertiesInput = Parameters<typeof updatePostProperties>[1];

const postListQueryKey = (parentId?: string | null) =>
  parentId ? ["posts", parentId] : ["posts", "root"];

interface PostCache {
  [postId: string]: {
    data: PostWithContent | Post;
    timestamp: number;
    isDetail: boolean;
  };
}

interface PostTreeCache {
  [parentId: string]: {
    children: Post[];
    timestamp: number;
  };
}

export const postCacheAtom = atomWithStorage<PostCache>("post-cache", {});
export const postTreeCacheAtom = atomWithStorage<PostTreeCache>(
  "post-tree-cache",
  {},
);
export const expandedNodesAtom = atomWithStorage<string[]>(
  "expanded-nodes",
  [],
);
export const selectedPostIdAtom = atom<string | null>(null);

export const rootPostsAtom = atomFamily((owner: string) =>
  atomWithQuery(
    () => ({
      queryKey: postListQueryKey(),
      queryFn: async () => {
        const response = await getRootPosts(owner);
        return response.data || [];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }),
    () => queryClient,
  ),
);

export const postChildrenAtom = atomFamily((postId: string) =>
  atomWithQuery(() => ({
    queryKey: postListQueryKey(postId),
    queryFn: async () => {
      const response = await getDirectChildren(postId);
      return response.data;
    },
  })),
);

export const recentPostAtom = atomWithQuery(() => ({
  queryKey: ["post"],
  queryFn: async () => {
    const response = await getRencentPosts();
    return response.data || [];
  },
}));

export const postDetailAtom = atomFamily((postId: string) =>
  atomWithQuery(() => ({
    queryKey: ["post", "detail", postId],
    queryFn: async () => {
      const response = await getPostDetail(postId);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })),
);

export const createPostAtom = atomWithMutation(() => ({
  mutationFn: (post: PostWithContent) => createPost(post),
  onMutate: async (post) => {
    const queryKey = postListQueryKey(post.parentId);
    await queryClient.cancelQueries({ queryKey });
    const previousPosts = queryClient.getQueryData<PostWithContent[]>(queryKey);

    queryClient.setQueryData<PostWithContent[]>(queryKey, (old = []) => [
      post,
      ...(old as PostWithContent[]),
    ]);

    return { previousPosts };
  },
  onError: (error, variables, context) => {
    console.error("create Post error", error);

    const queryKey = postListQueryKey(variables.parentId);
    if (context?.previousPosts) {
      queryClient.setQueryData(queryKey, context.previousPosts);
    }
  },
  onSuccess: (_data, variables) => {
    queryClient.setQueryData<PostWithContent[]>(
      postListQueryKey(variables.parentId),
      (old = []) =>
        (old as PostWithContent[]).map((post) =>
          post._id === variables._id ? { ...post, ...variables } : post,
        ),
    );
  },
}));

export const deleteSinglePostAtom = atomWithMutation(() => ({
  mutationFn: ({
    postId,
  }: {
    postId: string;
    parentId?: string | null;
  }) => deletePost(postId),
  onMutate: async ({ postId, parentId }) => {
    const queryKey = postListQueryKey(parentId);
    await queryClient.cancelQueries({ queryKey });
    const previousPosts = queryClient.getQueryData<Post[]>(queryKey);

    queryClient.setQueryData<Post[]>(queryKey, (old = []) =>
      (old as Post[]).filter((post: Post) => post._id !== postId),
    );

    return { previousPosts };
  },
  onError: (error, variables, context) => {
    const queryKey = postListQueryKey(variables.parentId);
    if (context?.previousPosts) {
      queryClient.setQueryData(queryKey, context.previousPosts);
    }
    console.error("删除文章失败:", error);
  },
  onSuccess: (_data, variables) => {
    const queryKey = postListQueryKey(variables.parentId);
    queryClient.invalidateQueries({ queryKey });
  },
}));

export const updatePostContentAtom = atomWithMutation(() => ({
  mutationFn: ({ postId, content }: { postId: string; content: string }) =>
    updatePostContent(postId, content),
  onError: (error) => {
    console.error("更新文章失败:", error);
  },
}));

export const updatePostPropertiesAtom = atomWithMutation(() => ({
  mutationFn: ({
    postId,
    properties,
  }: {
    postId: string;
    properties: PostPropertiesInput;
    parentId?: string | null;
  }) => updatePostProperties(postId, properties),
  onMutate: async ({ postId, properties, parentId }) => {
    const currentQueryKey = postListQueryKey(parentId);
    const nextParentId = properties.parentId ?? parentId;
    const nextQueryKey = postListQueryKey(nextParentId);
    const detailQueryKey = ["post", "detail", postId];
    await queryClient.cancelQueries({ queryKey: currentQueryKey });
    if (JSON.stringify(currentQueryKey) !== JSON.stringify(nextQueryKey)) {
      await queryClient.cancelQueries({ queryKey: nextQueryKey });
    }
    await queryClient.cancelQueries({ queryKey: detailQueryKey });
    const previousPosts = queryClient.getQueryData<Post[]>(currentQueryKey);
    const previousNextPosts = queryClient.getQueryData<Post[]>(nextQueryKey);
    const previousDetail = queryClient.getQueryData<PostWithContent>(detailQueryKey);
    const currentPost =
      previousPosts?.find((post) => post._id === postId) ??
      previousDetail ??
      null;
    const nextPost =
      currentPost == null
        ? null
        : ({
            ...currentPost,
            ...properties,
            parentId: nextParentId ?? null,
          } as PostWithContent);

    if (parentId !== nextParentId) {
      queryClient.setQueryData<Post[]>(currentQueryKey, (old = []) =>
        (old as Post[]).filter((post: Post) => post._id !== postId),
      );
      if (nextPost) {
        queryClient.setQueryData<Post[]>(nextQueryKey, (old = []) => {
          const nextList = (old as Post[]).filter((post) => post._id !== postId);
          return [nextPost, ...nextList];
        });
      }
    } else {
      queryClient.setQueryData<Post[]>(currentQueryKey, (old = []) =>
        (old as Post[]).map((post: Post) =>
          post._id === postId ? { ...post, ...properties } : post,
        ),
      );
    }
    queryClient.setQueryData<PostWithContent>(detailQueryKey, (old) =>
      old ? { ...old, ...properties } : old,
    );

    return { previousPosts, previousNextPosts, previousDetail, nextParentId };
  },
  onError: (_error, variables, context) => {
    if (context?.previousPosts) {
      queryClient.setQueryData(
        postListQueryKey(variables.parentId),
        context.previousPosts,
      );
    }
    if (context?.previousNextPosts) {
      queryClient.setQueryData(
        postListQueryKey(context.nextParentId),
        context.previousNextPosts,
      );
    }
    if (context?.previousDetail) {
      queryClient.setQueryData(
        ["post", "detail", variables.postId],
        context.previousDetail,
      );
    }
  },
  onSuccess: (_data, variables) => {
    const currentQueryKey = postListQueryKey(variables.parentId);
    const nextQueryKey = postListQueryKey(variables.properties.parentId ?? variables.parentId);
    queryClient.invalidateQueries({ queryKey: currentQueryKey });
    if (JSON.stringify(currentQueryKey) !== JSON.stringify(nextQueryKey)) {
      queryClient.invalidateQueries({ queryKey: nextQueryKey });
    }
  },
}));
