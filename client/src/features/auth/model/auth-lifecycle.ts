import type { AuthIdentityBroadcast } from "./types";
import type { AccountScope } from "./account-scope";

const IDENTITY_CHANNEL = "nubbi-auth-lifecycle";
const IDENTITY_STORAGE_KEY = "nubbi.auth.identity-change";

/** 跨标签页身份通知的唯一允许结构，不携带用户、凭证或业务数据。 */
export interface IdentityChangedMessage {
  type: "identity-changed";
  sourceId: string;
  sequence: number;
}

/** 身份代次清理器，按取消、清空、断连和恢复四个阶段执行。 */
export interface AuthLifecycleParticipant {
  id: string;
  cancel?: (generation: number) => void | Promise<void>;
  clear?: (generation: number) => void | Promise<void>;
  disconnect?: (generation: number) => void | Promise<void>;
  restore?: (scope: AccountScope) => void | Promise<void>;
}

/** 账号生命周期清理注册表的公开能力。 */
export interface AuthLifecycleRegistry {
  /**
   * 注册幂等清理参与者；相同 id 的新注册替换旧注册。
   * @param participant 分阶段清理与恢复操作。
   * @returns 仅移除本次注册的取消函数。
   */
  register(participant: AuthLifecycleParticipant): () => void;
  /**
   * 使旧代次工作失效，并严格按取消、清空、断连顺序执行。
   * @param generation 身份变化后的新 generation。
   * @returns 本次清理阶段全部落定后的 Promise。
   */
  invalidate(generation: number): Promise<void>;
  /**
   * 仅为已认证的新代次恢复已注册资源。
   * @param scope 已确认的账号作用域。
   * @returns 清理完成且恢复阶段全部落定后的 Promise。
   */
  restore(scope: AccountScope): Promise<void>;
}

/**
 * 逐个隔离执行同一阶段，单个模块异常不会跳过其他清理器。
 * @param operations 本阶段操作列表。
 * @returns 所有操作均已落定的 Promise。
 */
const settleOperations = async (
  operations: Array<() => void | Promise<void>>,
): Promise<void> => {
  await Promise.allSettled(
    operations.map(async (operation) => {
      await operation();
    }),
  );
};

/**
 * 创建可注入验证的账号生命周期注册表。
 * @returns 严格排序且幂等的清理与恢复协调器。
 */
export const createAuthLifecycleRegistry = (): AuthLifecycleRegistry => {
  const participants = new Map<string, AuthLifecycleParticipant>();
  let transitionTail: Promise<void> = Promise.resolve();
  let latestGeneration = -1;
  let restoredScope: AccountScope | null = null;

  /**
   * 为最新且尚未恢复的认证代次运行全部恢复器。
   * @param scope 已确认的账号与 generation；旧代次或已恢复代次会被静默丢弃。
   * @returns 全部恢复器落定后的 Promise；参与者异常由阶段执行器隔离。
   */
  const runRestore = async (scope: AccountScope): Promise<void> => {
    if (scope.generation !== latestGeneration) return;
    if (
      restoredScope?.ownerId === scope.ownerId &&
      restoredScope.generation === scope.generation
    ) {
      return;
    }
    await settleOperations(
      [...participants.values()].flatMap((participant) =>
        participant.restore ? [() => participant.restore?.(scope)] : [],
      ),
    );
    if (scope.generation === latestGeneration) restoredScope = scope;
  };

  return {
    register(participant) {
      participants.set(participant.id, participant);
      const registered = participant;
      if (restoredScope && participant.restore) {
        void Promise.resolve(participant.restore(restoredScope)).catch(() => undefined);
      }
      return () => {
        if (participants.get(participant.id) === registered) {
          participants.delete(participant.id);
        }
      };
    },
    invalidate(generation) {
      if (generation <= latestGeneration) return transitionTail;
      latestGeneration = generation;
      restoredScope = null;
      transitionTail = transitionTail.then(async () => {
        const current = [...participants.values()];
        await settleOperations(
          current.flatMap((participant) =>
            participant.cancel ? [() => participant.cancel?.(generation)] : [],
          ),
        );
        await settleOperations(
          current.flatMap((participant) =>
            participant.clear ? [() => participant.clear?.(generation)] : [],
          ),
        );
        await settleOperations(
          current.flatMap((participant) =>
            participant.disconnect
              ? [() => participant.disconnect?.(generation)]
              : [],
          ),
        );
      });
      return transitionTail;
    },
    restore(scope) {
      if (scope.generation < latestGeneration) return transitionTail;
      latestGeneration = scope.generation;
      transitionTail = transitionTail.then(() => runRestore(scope));
      return transitionTail;
    },
  };
};

/** 浏览器进程内唯一账号生命周期注册表。 */
export const authLifecycleRegistry = createAuthLifecycleRegistry();

/**
 * 校验外部消息只含匿名身份变化字段。
 * @param value 广播或 storage 事件传入的未知值。
 * @returns 合法的匿名身份通知，否则为 null。
 */
const parseIdentityMessage = (value: unknown): IdentityChangedMessage | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 3 ||
    record.type !== "identity-changed" ||
    typeof record.sourceId !== "string" ||
    !Number.isSafeInteger(record.sequence) ||
    Number(record.sequence) <= 0
  ) {
    return null;
  }
  return {
    type: "identity-changed",
    sourceId: record.sourceId,
    sequence: Number(record.sequence),
  };
};

/**
 * 创建 BroadcastChannel + storage fallback 的匿名跨标签身份通知器。
 * @returns 符合协调器接口的广播实例。
 */
export const createBrowserIdentityBroadcast = (): AuthIdentityBroadcast => {
  const sourceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}`;
  const listeners = new Set<(reason: string) => void>();
  const lastSequenceBySource = new Map<string, number>();
  let sequence = 0;
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(IDENTITY_CHANNEL);

  /**
   * 接收并去重匿名身份变化消息，再通知本标签页重新确认 Cookie。
   * @param value BroadcastChannel 或 storage event 携带的未知消息。
   * @returns 无返回值；非法结构、同 source、重复或倒序 sequence 会被静默丢弃。
   */
  const receive = (value: unknown): void => {
    const message = parseIdentityMessage(value);
    if (!message || message.sourceId === sourceId) return;
    const previous = lastSequenceBySource.get(message.sourceId) ?? 0;
    if (message.sequence <= previous) return;
    lastSequenceBySource.set(message.sourceId, message.sequence);
    listeners.forEach((listener) => listener("identity-changed"));
  };

  channel?.addEventListener("message", (event: MessageEvent<unknown>) => {
    receive(event.data);
  });
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== IDENTITY_STORAGE_KEY || !event.newValue) return;
      try {
        receive(JSON.parse(event.newValue) as unknown);
      } catch {
        // 损坏或非本应用消息不参与身份状态机。
      }
    });
  }

  return {
    publish() {
      const message: IdentityChangedMessage = {
        type: "identity-changed",
        sourceId,
        sequence: (sequence += 1),
      };
      channel?.postMessage(message);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(message));
          window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
        } catch {
          // storage 不可用时 BroadcastChannel 仍可工作；两者都不可用则保持当前标签页语义。
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
