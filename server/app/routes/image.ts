import express, { query } from "express";
import { asyncHandler } from "../middleware/common";

import { successResponse } from "./utils";
import image from "@/models/image";
const router = express.Router();
router.post(
    "/create",
    asyncHandler(async (req, res) => {
        const { name, content, ...query } = req.body;
        const result = await image.create({ name, content, ...query });
        successResponse(res, result);
    })
);
router.get(
    "/get",
    asyncHandler(async (req, res) => {
        const { id } = req.query;
        const result = await image.findById(id);
        successResponse(res, result);
    })
)
router.delete(
    "/delete",
    asyncHandler(async (req, res) => {
        const { id } = req.query;
        const result = await image.findByIdAndDelete(id);
        successResponse(res, result);
    })
)
export default router;
