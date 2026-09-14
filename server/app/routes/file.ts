import express from "express";
import fileAccessRouter from "./fileAccess";
import fileManagementRouter from "./fileManagement";
import fileUploadRouter from "./fileUpload";

const router = express.Router();

router.use(fileUploadRouter);
router.use(fileManagementRouter);
router.use(fileAccessRouter);

export default router;
