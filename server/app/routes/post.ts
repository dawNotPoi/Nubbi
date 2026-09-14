import { getUser } from "@/lib/auth";
import requireAuth from "@/middleware/session";
import express from "express";
import { z } from "zod";
import { createPost } from "../controller/post/create";
import { deletePost } from "../controller/post/delete";
import {
  getDirectChildren,
  getPostById,
  getPosts,
  getRencentPosts,
  getRootPosts,
  searchPosts,
  validatePostUser,
} from "../controller/post/query";
import { updatePostContent, updatePostMeta } from "../controller/post/update";
import { asyncHandler } from "../middleware/common";
import { validate, validateQuery } from "../middleware/validator";
import { successResponse } from "./utils";

const router = express.Router();

const getSingleQueryValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

router.post(
  "/create",
  requireAuth,
  validate(
    z.object({
      title: z.string(),
      content: z.string().optional(),
      parentId: z.string().optional(),
      meta: z.record(z.any()).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const postData = req.body;
    const result = await createPost({ ...postData, userId: id });
    successResponse(res, result, "创建成功");
  }),
);

router.put(
  "/content",
  requireAuth,
  validate(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
      content: z.string(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { postId, content } = req.body;
    const user = await getUser(req);
    if (!validatePostUser(user.id, postId)) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const result = await updatePostContent(postId, content);
    successResponse(res, result, "内容更新成功");
  }),
);

router.put(
  "/properties",
  requireAuth,
  validate(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
      parentId: z.string().optional(),
      meta: z.record(z.any()).optional(),
      cover: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { postId, ...properties } = req.body;
    const user = await getUser(req);
    if (!validatePostUser(user.id, postId)) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    const result = await updatePostMeta(postId, properties);
    successResponse(res, result, "属性更新成功");
  }),
);

router.get(
  "/roots",
  asyncHandler(async (req, res) => {
    const owner = getSingleQueryValue(req.query.owner);
    if (!owner) {
      throw Object.assign(new Error("owner is required"), { status: 400 });
    }
    const result = await getRootPosts(owner);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/children",
  requireAuth,
  validateQuery(
    z.object({
      parentId: z.string().min(1, "父级ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const parentId = getSingleQueryValue(req.query.parentId);
    if (!parentId) {
      throw Object.assign(new Error("parentId is required"), { status: 400 });
    }
    const result = await getDirectChildren(parentId);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/detail",
  requireAuth,
  validateQuery(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const postId = getSingleQueryValue(req.query.postId);
    if (!postId) {
      throw Object.assign(new Error("postId is required"), { status: 400 });
    }
    const result = await getPostById(postId);
    successResponse(res, result, "查询成功");
  }),
);

router.delete(
  "/delete",
  requireAuth,
  validate(
    z.object({
      postId: z.string().refine((val) => val.length > 0, "文章ID不能为空"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { postId } = req.body;
    const { id } = await getUser(req);
    if (!validatePostUser(id, postId)) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    await deletePost(postId);
    successResponse(res, null, "删除成功");
  }),
);

router.get(
  "/getPost",
  asyncHandler(async (req, res) => {
    const userId = getSingleQueryValue(req.query.userId);
    if (!userId) {
      throw Object.assign(new Error("userId is required"), { status: 400 });
    }
    const result = await getPosts(userId);
    successResponse(res, result, "查询成功");
  }),
);

router.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const result = await getRencentPosts(owner.id);
    successResponse(res, result, "查询成功");
  }),
);

router.post(
  "/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const owner = await getUser(req);
    const { title } = req.body;
    const result = await searchPosts(owner.id, title);
    successResponse(res, result, "查询成功");
  }),
);

export default router;
