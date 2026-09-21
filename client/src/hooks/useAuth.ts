import {
  authSessionCoordinator,
  useAuthSessionSnapshot,
} from "@/features/auth/model/session-coordinator";
import {
  deleteAccountWithCode,
  registerWithCode,
  sendAccountDeletionCode,
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  updateAuthAvatar,
} from "@/features/auth/model/auth-actions";
import { useCallback } from "react";
import type {
  AuthOperation,
  AuthSessionSnapshot,
  AuthSessionStatus,
  AuthUser,
} from "@/features/auth/model/types";

/** 认证组件可消费的统一状态与动作门面。 */
export interface UseAuthResult {
  user: AuthUser | undefined;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  sessionPending: boolean;
  hasAccessToken: boolean;
  status: AuthSessionStatus;
  operation: AuthOperation;
  generation: number;
  login(email: string, password: string): ReturnType<typeof signInWithEmail>;
  register(
    email: string,
    password: string,
    username: string,
    code: string,
  ): ReturnType<typeof registerWithCode>;
  loginWithGitHub(callbackURL?: string): ReturnType<typeof signInWithGitHub>;
  loginWithGoogle(callbackURL?: string): ReturnType<typeof signInWithGoogle>;
  logout(): ReturnType<typeof signOut>;
  requestAccountDeletionCode(): ReturnType<typeof sendAccountDeletionCode>;
  deleteAccount(code: string): ReturnType<typeof deleteAccountWithCode>;
  updateAvatar(imageUrl: string): ReturnType<typeof updateAuthAvatar>;
  retrySession(): Promise<AuthSessionSnapshot>;
  isAuthenticated: boolean;
}

/**
 * 订阅唯一认证协调器，并为现有组件保留认证动作门面。
 * @returns 由共享快照派生的用户、状态和认证动作。
 */
export const useAuth = (): UseAuthResult => {
  const snapshot = useAuthSessionSnapshot();

  const login = useCallback(
    (email: string, password: string) => signInWithEmail(email, password),
    [],
  );

  const register = useCallback(
    (email: string, password: string, username: string, code: string) =>
      registerWithCode({ email, password, username, code }),
    [],
  );

  const loginWithGitHub = useCallback(
    (callbackURL?: string) => signInWithGitHub(callbackURL),
    [],
  );

  const loginWithGoogle = useCallback(
    (callbackURL?: string) => signInWithGoogle(callbackURL),
    [],
  );

  const logout = useCallback(async () => {
    return signOut();
  }, []);

  const requestAccountDeletionCode = useCallback(
    () => sendAccountDeletionCode(),
    [],
  );

  const deleteAccount = useCallback(
    (code: string) => deleteAccountWithCode(code),
    [],
  );

  const updateAvatar = useCallback(
    (imageUrl: string) => updateAuthAvatar(imageUrl),
    [],
  );

  const retrySession = useCallback(
    () => authSessionCoordinator.refresh(),
    [],
  );

  const isAuthenticated = snapshot.status === "authenticated";
  return {
    user: snapshot.user ?? undefined,
    loading: snapshot.operation !== "idle",
    error: snapshot.error,
    initialized: snapshot.initialized,
    sessionPending: snapshot.status === "checking",
    hasAccessToken: isAuthenticated,
    status: snapshot.status,
    operation: snapshot.operation,
    generation: snapshot.generation,
    login,
    register,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    requestAccountDeletionCode,
    deleteAccount,
    updateAvatar,
    retrySession,
    isAuthenticated,
  };
};
