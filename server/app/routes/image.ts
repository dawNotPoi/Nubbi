import image from "@/models/image";
import express from "express";
import { asyncHandler } from "../middleware/common";
import { successResponse } from "./utils";

const router = express.Router();

router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const { name, content, ...rest } = req.body;
    const result = await image.create({ name, content, ...rest });
    successResponse(res, result);
  }),
);

router.get(
  "/get",
  asyncHandler(async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    const result = id ? await image.findById(id) : null;
    successResponse(res, result);
  }),
);

router.delete(
  "/delete",
  asyncHandler(async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : undefined;
    const result = id ? await image.findByIdAndDelete(id) : null;
    successResponse(res, result);
  }),
);

export default router;
