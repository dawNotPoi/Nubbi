import express from "express";
import readRouter from "./read";
import writeRouter from "./write";

const router = express.Router();

router.use(readRouter);
router.use(writeRouter);

export default router;
