import { paginationQuerySchema } from "@/common/pagination";
import { successResponse } from "@/routes/utils";
import {
  getLegacyMeetingPage,
  getMeetingPage,
} from "@/services/meeting/list";
import { legacyMeetingPageSchema } from "@/services/meeting/schemas";
import type { Request, Response } from "express";

export const listMeetingsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const pagination = paginationQuerySchema.parse(req.query);
  successResponse(res, await getMeetingPage(pagination));
};

export const listMeetingsLegacyController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const input = legacyMeetingPageSchema.parse(req.body);
  successResponse(res, await getLegacyMeetingPage(input));
};
