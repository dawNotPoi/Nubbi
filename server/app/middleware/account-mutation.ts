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

/** 只读 HTTP 方法，不触发账号写入互斥 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** 已跳过变更追踪的请求集合 */
const skippedRequests = new WeakSet<Request>();
/** 当前请求的 Response 上下文，供服务和控制器层读取 */
const currentResponse = new AsyncLocalStorage<Response>();
/** 每个 Response 上已获取的账号变更锁记录 */
const trackedMutations = new WeakMap<
  Response,
  Map<string, () => void>
>();

/** 为 Response 注册用户的账号变更锁，确保注销互斥 */
const trackMutationForResponse = (
  res: Response,
  userId: string,
): void => {
  const releases = trackedMutations.get(res) ?? new Map<string, () => void>();
  if (releases.has(userId)) return;

  releases.set(userId, acquireAccountMutation(userId));
  trackedMutations.set(res, releases);
};

/** 标记该请求跳过账号变更追踪（用于不修改账号数据的路由） */
export const skipAccountMutationTracking: RequestHandler = (
  req,
  _res,
  next,
): void => {
  skippedRequests.add(req);
  next();
};

/** 在写请求上登记账号变更锁，与账号注销形成互斥 */
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

/** 请求处理完毕后释放该 Response 上的所有账号变更锁 */
export const completeAccountMutationHandler = (res: Response): void => {
  const releases = trackedMutations.get(res);
  if (!releases) return;

  trackedMutations.delete(res);
  releases.forEach((release) => release());
};

/** 在指定 Response 上下文中执行操作，期间服务层可读取当前账号 */
export const runWithAccountMutationContext = <Result>(
  res: Response,
  operation: () => Promise<Result>,
): Promise<Result> => currentResponse.run(res, operation);

/** 服务层调用：为当前请求的 Response 登记账号变更锁，无上下文时校验注销状态 */
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
