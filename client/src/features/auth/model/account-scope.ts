import { getAuthSessionSnapshot } from "./session-coordinator";

/** 绑定一次账号身份代次的不可变业务作用域。 */
export interface AccountScope {
  ownerId: string;
  generation: number;
}

/** 私有查询统一使用的账号前缀。 */
export type AccountQueryKey<T extends readonly unknown[]> = readonly [
  "account",
  string,
  ...T,
];

/**
 * 为私有领域 key 增加显式账号前缀。
 * @param ownerId 已认证账号 ID。
 * @param domainKey 不含账号信息的领域 key。
 * @returns 以 account、ownerId 开头的不可变查询 key。
 */
export const accountQueryKey = <T extends readonly unknown[]>(
  ownerId: string,
  domainKey: T,
): AccountQueryKey<T> => {
  if (!ownerId.trim()) throw new Error("私有查询缺少账号作用域");
  return ["account", ownerId, ...domainKey] as const;
};

/**
 * 在受保护组件中确认并返回显式账号 ID。
 * @param ownerId 会话快照提供的可选账号 ID。
 * @returns 非空账号 ID。
 */
export const requireOwnerId = (ownerId?: string): string => {
  if (!ownerId) throw new Error("当前没有可用的认证账号");
  return ownerId;
};

/**
 * 捕获当前已认证账号及其 generation，供异步 mutation 固定写回边界。
 * @returns 当前账号作用域；身份未确认时为 null。
 */
export const captureAccountScope = (): AccountScope | null => {
  const snapshot = getAuthSessionSnapshot();
  if (snapshot.status !== "authenticated" || !snapshot.user) return null;
  return { ownerId: snapshot.user.id, generation: snapshot.generation };
};

/**
 * 捕获当前账号作用域，身份未确认时直接拒绝业务操作。
 * @returns 当前已认证账号作用域。
 */
export const requireAccountScope = (): AccountScope => {
  const scope = captureAccountScope();
  if (!scope) throw new Error("当前没有可用的认证账号");
  return scope;
};

/**
 * 比较两个账号作用域是否属于同一 owner 与同一 generation。
 * @param expected 操作发起时捕获的账号作用域。
 * @param current 回调执行时的账号作用域；未认证时为 null。
 * @returns 两个作用域完全一致时为 true。
 */
export const isSameAccountScope = (
  expected: AccountScope,
  current: AccountScope | null,
): boolean =>
  current?.ownerId === expected.ownerId &&
  current.generation === expected.generation;

/**
 * 判断异步回调是否仍属于当前账号与代次。
 * @param scope 请求或 mutation 发起时捕获的作用域。
 * @returns 当前身份仍与捕获作用域一致时为 true。
 */
export const isAccountScopeCurrent = (scope: AccountScope): boolean => {
  return isSameAccountScope(scope, captureAccountScope());
};

/**
 * 在异步边界后确认原账号代次仍有效，阻止旧操作继续发起业务请求。
 * @param scope 操作开始时捕获的账号作用域。
 * @returns 无返回值；作用域过期时抛出错误。
 */
export const assertAccountScopeCurrent = (scope: AccountScope): void => {
  if (!isAccountScopeCurrent(scope)) {
    throw new Error("账号状态已变化，请重试当前操作");
  }
};
