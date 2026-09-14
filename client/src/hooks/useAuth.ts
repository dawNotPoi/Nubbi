import {
  clearAuthState,
  getCurrentSession,
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  useAuthRuntime,
  useSession,
} from "@/utils/auth";
import { routes } from "@/utils/routes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
};

const waitForSessionRetry = (duration: number) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

const getConfirmedSessionUser = async () => {
  let lastErrorMessage: string | undefined;

  for (const delay of [0, 120, 300, 600]) {
    if (delay > 0) {
      await waitForSessionRetry(delay);
    }

    const currentSession = await getCurrentSession();
    const user = currentSession.session?.data?.user;

    if (currentSession.success && user) {
      return { user };
    }

    lastErrorMessage = currentSession.error?.message;
  }

  return {
    errorMessage: lastErrorMessage || "登录状态确认失败，请重新登录",
  };
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
        await refetchSession();

        const confirmedSession = await getConfirmedSessionUser();

        if (confirmedSession.user) {
          setRecoveredUser(confirmedSession.user);
          await refetchSession();
        } else {
          clearAuthState();
          const message = confirmedSession.errorMessage;
          setError(message);
          setLoading(false);
          return {
            success: false,
            error: {
              message,
            },
          };
        }
      } else {
        setError(result.error?.message || "登录失败");
      }
      setLoading(false);
      return result;
    },
    [refetchSession],
  );

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      setLoading(true);
      setError(null);
      const result = await signUpWithEmail(email, password, username);
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
    isAuthenticated,
  };
};
