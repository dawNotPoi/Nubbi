import express from "express";
import { createSummary, findSummary } from "../control/summary";
import { asyncHandler } from "../middleware/common";
const router = express.Router();

router.post(
  "/create",
  asyncHandler(async (req, res) => {
    try {
      const data = await createSummary(req.body);
      res.json({
        code: 1,
        message: "success",
        data,
      });
    } catch (error) {
      res.json({
        status: 0,
        message: error,
      });
    }
  })
);

router.post(
  "/find",
  asyncHandler(async (req, res) => {
    try {
      const data = await findSummary(req.body);
      res.json({
        code: 1,
        message: "success",
        data,
      });
    } catch (error) {
      res.json({
        status: 0,
        message: error,
      });
    }
  })
);
export default router;
