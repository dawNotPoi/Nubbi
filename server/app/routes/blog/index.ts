import {
  getBlogPost,
  listBlogPosts,
  listBlogTags,
} from "@/controller/blog/queries";
import { createPublicJsonRouteRegistrar } from "@/routes/infrastructure/json-route-registrar";
import express from "express";
import { blogListQuerySchema, blogPostParamsSchema } from "./schemas";

const router = express.Router();
// 禁止浏览器或代理缓存公开正文，撤回发布后的新请求必须重新校验。
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
const routes = createPublicJsonRouteRegistrar<"read">(router);

routes.get("/posts", {
  action: "read",
  query: blogListQuerySchema,
  handler: ({ query }) => listBlogPosts(query),
});
routes.get("/tags", {
  action: "read",
  handler: () => listBlogTags(),
});
routes.get("/posts/:id", {
  action: "read",
  params: blogPostParamsSchema,
  handler: ({ params }) => getBlogPost(params.id),
});

export default router;
