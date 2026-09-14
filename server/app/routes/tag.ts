import { getUser } from "@/lib/auth";
// 业务路由同时接受 session/JWT 与长期 API token
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import express from "express";
import { z } from "zod";
import { createTag, deleteTag, listTags } from "../controller/tag";
import { asyncHandler } from "../middleware/common";
import { validate } from "../middleware/validator";
import { successResponse } from "./utils";

const router = express.Router();

router.get(
  "/list",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const result = await listTags(user.id);
    successResponse(res, result, "query success");
  }),
);

router.post(
  "/create",
  requireAuth,
  validate(
    z.object({
      name: z.string().trim().min(1).max(50),
    }),
  ),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const result = await createTag(user.id, req.body.name);
    successResponse(res, result, "create success");
  }),
);

router.delete(
  "/delete",
  requireAuth,
  validate(
    z.object({
      name: z.string().trim().min(1).max(50),
    }),
  ),
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    await deleteTag(user.id, req.body.name);
    successResponse(res, null, "delete success");
  }),
);

export default router;
