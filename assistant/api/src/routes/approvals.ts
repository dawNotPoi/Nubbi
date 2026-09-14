import { Router } from "express";
import { z } from "zod";
import { resolveApproval } from "../approvals.js";

export const approvalRoutes = Router();

approvalRoutes.post("/approvals/:id", (request, response) => {
  const body = z.object({ approved: z.boolean() }).safeParse(request.body);
  if (!body.success) {
    response.status(400).json({ message: "审批结果无效" });
    return;
  }
  const result = resolveApproval(request.params.id, body.data.approved);
  if (result === "missing") {
    response.status(404).json({ message: "审批不存在或已结束" });
    return;
  }
  response.status(204).end();
});
