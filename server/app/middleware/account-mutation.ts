import {
  acquireAccountMutation,
  isAccountDeletionInProgress,
} from "@/services/auth/account-mutation-guard";
import { AsyncLocalStorage } from "async_hooks";
import type {
  Request,
  RequestHandler,
  Response,
} from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const skippedRequests = new WeakSet<Request>();
const currentResponse = new AsyncLocalStorage<Response>();
const trackedMutations = new WeakMap<
  Response,
  Map<string, () => void>
>();

const trackMutationForResponse = (
  res: Response,
  userId: string,
): void => {
  const releases = trackedMutations.get(res) ?? new Map<string, () => void>();
  if (releases.has(userId)) return;

  releases.set(userId, acquireAccountMutation(userId));
  trackedMutations.set(res, releases);
};

export const skipAccountMutationTracking: RequestHandler = (
  req,
  _res,
  next,
): void => {
  skippedRequests.add(req);
  next();
};

export const trackAuthenticatedMutation = (
  req: Request,
  res: Response,
  userId: string,
): void => {
  if (
    SAFE_METHODS.has(req.method) ||
    skippedRequests.has(req) ||
    trackedMutations.has(res)
  ) {
    return;
  }

  trackMutationForResponse(res, userId);
};

export const completeAccountMutationHandler = (res: Response): void => {
  const releases = trackedMutations.get(res);
  if (!releases) return;

  trackedMutations.delete(res);
  releases.forEach((release) => release());
};

export const runWithAccountMutationContext = <Result>(
  res: Response,
  operation: () => Promise<Result>,
): Promise<Result> => currentResponse.run(res, operation);

export const trackCurrentAccountMutation = (userId: string): void => {
  const res = currentResponse.getStore();
  if (res) {
    trackMutationForResponse(res, userId);
    return;
  }
  if (isAccountDeletionInProgress(userId)) {
    throw new Error("Account deletion is in progress");
  }
};
