/** 可公开的文章摘要，不包含作者账户 ID、密码或内部元数据。 */
export type BlogPostSummary = {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  cover: string;
  author: string | null;
  date: string;
  updatedAt: string;
};

/** 已经过公开条件检查的完整博客文章。 */
export type BlogPost = BlogPostSummary & { content: string };

/** 公开标签及其可阅读文章数量。 */
export type BlogTag = { name: string; count: number };

/** 博客领域查询参数，由接口层校验后传入。 */
export type BlogListInput = {
  offset: number;
  limit: number;
  q: string;
  tag: string;
  order: "newest" | "oldest" | "updated";
};
