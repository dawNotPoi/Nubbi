import express from "express";
import readRouter from "./mcp/read";
import writeRouter from "./mcp/write";

const router = express.Router();

router.use(readRouter);
router.use(writeRouter);

export default router;
