import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  useAuthRuntime,
  useSession,
} from "@/utils/auth";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const { data: session, refetch: refetchSession, isPending } = useSession();
  const { accessToken, initialized } = useAuthRuntime();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      const result = await signInWithEmail(email, password);
      if (result.success) {
        await refetchSession();
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
    navigate("/login");
    return result;
  }, [navigate]);

  return {
    user: session?.user,
    loading,
    error,
    initialized,
    sessionPending: isPending,
    hasAccessToken: !!accessToken,
    login,
    register,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    isAuthenticated: !!session?.user && !!accessToken,
  };
};
