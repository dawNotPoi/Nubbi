// routes.js
import { getUser } from "@/lib/auth";
import requireAuth from "@/middleware/session";
import express from "express";
import { z } from "zod";
import { createPost } from "../control/post/create";
import { deletePost } from "../control/post/delete";
import {
  getDirectChildren,
  getPostById,
  getPosts,
  getRootPosts,
  validatePostUser,
} from "../control/post/query";
import { updatePostContent, updatePostMeta } from "../control/post/update";
import { asyncHandler } from "../middleware/common";
import { validate, validateQuery } from "../middleware/validator";
import { successResponse } from "./utils";

const router = express.Router();

// 创建文章
router.post(
  "/create",
  requireAuth,
  validate(
    z.object({
      title: z.string().min(1, "标题不能为空").max(200, "标题不能超过200字符"),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      summary: z.string().max(500, "摘要不能超过500字符").optional(),
      status: z.enum(["Draft", "Published", "Archived"]).default("Draft"),
      parentId: z.string().optional(),
      meta: z.record(z.any()).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { id } = await getUser(req);
    const postData = req.body;
    const result = await createPost({ ...postData, userId: id });
    successResponse(res, result, "创建成功");
  })
);

// 修改文章内容
router.put(
  "/content",
  requireAuth,
  validate(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
      content: z.string(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { postId, content } = req.body;
    const user = await getUser(req);
    if (!validatePostUser(user.id, postId))
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    const result = await updatePostContent(postId, content);
    successResponse(res, result, "内容更新成功");
  })
);

// 修改文章属性
router.put(
  "/properties",
  requireAuth,
  validate(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
      title: z
        .string()
        .min(1, "标题不能为空")
        .max(200, "标题不能超过200字符")
        .optional(),
      tags: z.array(z.string()).optional(),
      summary: z.string().max(500, "摘要不能超过500字符").optional(),
      status: z.enum(["Draft", "Published", "Archived"]).optional(),
      parentId: z.string().optional(),
      meta: z.record(z.any()).optional(),
      cover: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { postId, ...properties } = req.body;
    const user = await getUser(req);
    if (!validatePostUser(user.id, postId))
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    const result = await updatePostMeta(postId, properties);
    successResponse(res, result, "属性更新成功");
  })
);

// 查询根级文章（不包含内容）
router.get(
  "/roots",
  asyncHandler(async (req, res) => {
    const { owner } = req.query;
    const result = await getRootPosts(owner as string);
    successResponse(res, result, "查询成功");
  })
);

// 查询直接子文章（不包含内容）
router.get(
  "/children",
  requireAuth,
  validateQuery(
    z.object({
      parentId: z.string().min(1, "父级ID不能为空"),
    })
  ),
  asyncHandler(async (req, res) => {
    const { parentId } = req.query;
    const result = await getDirectChildren(parentId);
    successResponse(res, result, "查询成功");
  })
);
//查询详情
router.get(
  "/detail",
  requireAuth,
  validateQuery(
    z.object({
      postId: z.string().min(1, "文章ID不能为空"),
    })
  ),
  asyncHandler(async (req, res) => {
    const { postId } = req.query;
    const result = await getPostById(postId);
    successResponse(res, result, "查询成功");
  })
);

// 删除文章（就删除单个吧）
router.delete(
  "/delete",
  requireAuth,
  validate(
    z.object({
      postId: z.string().refine((val) => {
        return val.length > 0;
      }, "文章ID不能为空"),
    })
  ),
  asyncHandler(async (req, res) => {
    const { postId } = req.body;
    const { id } = await getUser(req);
    if (!validatePostUser(id, postId))
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    await deletePost(postId);
    successResponse(res, null, "删除成功");
  })
);

//查询所有叶子文章
router.get(
  "/getPost",
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const result = await getPosts(userId);
    successResponse(res, result, "查询成功");
  })
);

export default router;
