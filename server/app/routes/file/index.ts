import express from "express";
import fileAccessRouter from "./access";
import fileManagementRouter from "./management";
import fileUploadRouter from "./upload";

const router = express.Router();

router.use(fileUploadRouter);
router.use(fileManagementRouter);
router.use(fileAccessRouter);

export default router;
