import {
  clearAuthState,
  deleteAccountWithCode,
  getCurrentSession,
  registerWithCode,
  sendAccountDeletionCode,
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  useAuthRuntime,
  useSession,
} from "@/utils/auth";
import { updateUserAvatar } from "@/api/file";
import { routes } from "@/utils/routes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
};

export const useAuth = () => {
  const { data: session, refetch: refetchSession, isPending } = useSession();
  const { accessToken, initialized } = useAuthRuntime();
  const recoveringSessionRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [sessionRecovering, setSessionRecovering] = useState(false);
  const [recoveredUser, setRecoveredUser] = useState<AuthUser | undefined>();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = session?.user ?? recoveredUser;
  const isAuthenticated = !!user && !!accessToken;

  useEffect(() => {
    if (session?.user) {
      setRecoveredUser(session.user);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!accessToken) {
      setRecoveredUser(undefined);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!initialized || !accessToken || session?.user) {
      return;
    }

    if (recoveringSessionRef.current) {
      return;
    }

    recoveringSessionRef.current = true;
    setSessionRecovering(true);
    getCurrentSession()
      .then((result) => {
        const nextUser = result.session?.data?.user;
        if (result.success && nextUser) {
          setRecoveredUser(nextUser);
          refetchSession();
          return;
        }

          clearAuthState();
      })
      .finally(() => {
        recoveringSessionRef.current = false;
        setSessionRecovering(false);
      });
  }, [accessToken, initialized, refetchSession, session?.user]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      const result = await signInWithEmail(email, password);
      if (result.success) {
        const immediateUser = (
          result.data as { data?: { user?: AuthUser } } | undefined
        )?.data?.user;
        if (immediateUser) {
          setRecoveredUser(immediateUser);
        }
        void refetchSession();
      } else {
        setError(result.error?.message || "登录失败");
      }
      setLoading(false);
      return result;
    },
    [refetchSession],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      code: string,
    ) => {
      setLoading(true);
      setError(null);
      const result = await registerWithCode({
        email,
        password,
        username,
        code,
      });
      if (!result.success) {
        setError(result.error?.message || "注册失败");
      }
      setLoading(false);
      return result;
    },
    [],
  );

  const loginWithGitHub = useCallback(async (callbackURL?: string) => {
    setLoading(true);
    setError(null);
    const result = await signInWithGitHub(callbackURL);
    if (!result.success) {
      setError(result.error?.message || "GitHub 登录失败");
      setLoading(false);
      return result;
    }

    setLoading(false);
    return result;
  }, []);

  const loginWithGoogle = useCallback(async (callbackURL?: string) => {
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle(callbackURL);
    if (!result.success) {
      setError(result.error?.message || "Google 登录失败");
      setLoading(false);
      return result;
    }

    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await signOut();
    setLoading(false);
    navigate(routes.login);
    return result;
  }, [navigate]);

  const requestAccountDeletionCode = useCallback(async () => {
    setError(null);
    const result = await sendAccountDeletionCode();
    if (!result.success) {
      setError(result.error?.message || "注销验证码发送失败");
    }
    return result;
  }, []);

  const deleteAccount = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      const result = await deleteAccountWithCode(code);
      setLoading(false);

      if (!result.success) {
        setError(result.error?.message || "账号注销失败");
        return result;
      }

      setRecoveredUser(undefined);
      navigate(routes.login, { replace: true });
      return result;
    },
    [navigate],
  );

  const updateAvatar = useCallback(
    async (imageUrl: string) => {
      setError(null);
      const result = await updateUserAvatar(imageUrl);
      if (result.code === 1) {
        await refetchSession();
        return { success: true, data: result.data };
      }
      const message = result.message || "头像更新失败";
      setError(message);
      return { success: false, error: { message } };
    },
    [refetchSession],
  );

  return {
    user,
    loading,
    error,
    initialized,
    sessionPending: isPending || sessionRecovering,
    hasAccessToken: !!accessToken,
    login,
    register,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    requestAccountDeletionCode,
    deleteAccount,
    updateAvatar,
    isAuthenticated,
  };
};
