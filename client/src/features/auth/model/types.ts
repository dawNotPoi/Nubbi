/** 客户端对外公开的会话确认状态。 */
export type AuthSessionStatus =
  | "checking"
  | "anonymous"
  | "authenticated"
  | "unavailable";

/** 当前正在执行的认证操作。 */
export type AuthOperation =
  | "idle"
  | "signingIn"
  | "redirecting"
  | "refreshing"
  | "signingOut"
  | "signOutFailed"
  | "deleting";

/** Better Auth 返回且会被客户端使用的用户字段。 */
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
  [key: string]: unknown;
}

/** UI 唯一订阅的会话快照；凭证不得进入此对象。 */
export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  user: AuthUser | null;
  generation: number;
  operation: AuthOperation;
  error: string | null;
  initialized: boolean;
}

/** 请求与 Socket 在发起时捕获的不可变凭证快照。 */
export interface AuthCredentialSnapshot {
  userId: string;
  generation: number;
  version: number;
  token: string;
}

/** 认证操作统一返回结构。 */
export interface AuthActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
  };
}

/** Provider 会话读取后的标准化结果。 */
export interface AuthProviderSessionResult {
  user: AuthUser | null;
  sessionToken: string | null;
  response: Response;
}

/** Provider 邮箱登录后的标准化结果。 */
export interface AuthProviderSignInResult {
  response: Response;
  data?: unknown;
  error?: unknown;
  redirectUrl?: string;
}

/** 可注入的认证 Provider，便于隔离浏览器 SDK 与协调逻辑。 */
export interface AuthSessionProvider {
  /**
   * 读取当前 Cookie 会话。
   * @param generation 请求发起时捕获的会话代次。
   * @returns 标准化的用户、Session 凭证与原始响应。
   */
  getSession(
    generation: number,
    signal?: AbortSignal,
  ): Promise<AuthProviderSessionResult>;
  /**
   * 提交邮箱密码登录。
   * @param email 邮箱地址。
   * @param password 登录密码。
   * @param generation 请求发起时捕获的会话代次。
   * @returns Provider 登录结果。
   */
  signInEmail(
    email: string,
    password: string,
    generation: number,
    signal?: AbortSignal,
  ): Promise<AuthProviderSignInResult>;
  /**
   * 发起第三方登录跳转。
   * @param provider 第三方 Provider 名称。
   * @param callbackURL 登录完成后的站内回调地址。
   * @param errorCallbackURL 登录失败后的站内回调地址。
   * @param generation 请求发起时捕获的会话代次。
   * @returns Provider 发起结果。
   */
  signInSocial(
    provider: "github" | "google",
    callbackURL: string,
    errorCallbackURL: string,
    generation: number,
    signal?: AbortSignal,
  ): Promise<AuthProviderSignInResult>;
  /**
   * 撤销远端会话。
   * @param generation 请求发起时捕获的会话代次。
   * @returns 远端响应。
   */
  signOut(generation: number, signal?: AbortSignal): Promise<Response>;
}

/** 协调器使用的可替换时钟。 */
export interface AuthCoordinatorClock {
  /** @returns 当前 Unix 毫秒时间。 */
  now(): number;
  /**
   * 注册一次延时回调。
   * @param callback 到期执行的回调。
   * @param delayMs 延迟毫秒数。
   * @returns 可供取消的句柄。
   */
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  /**
   * 取消延时回调。
   * @param handle 延时句柄。
   * @returns 无返回值。
   */
  clearTimeout(handle: ReturnType<typeof setTimeout>): void;
}

/** 跨标签页只传递身份失效通知，不携带用户或凭证。 */
export interface AuthIdentityBroadcast {
  /**
   * 广播身份变化原因。
   * @param reason 不含敏感数据的变化原因。
   * @returns 无返回值。
   */
  publish(reason: string): void;
  /**
   * 订阅其他标签页的身份变化。
   * @param listener 身份变化监听器。
   * @returns 取消订阅函数。
   */
  subscribe(listener: (reason: string) => void): () => void;
}
