import {
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  useSession,
} from "@/utils/auth";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setLoading(false);
    return result;
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      setLoading(true);
      setError(null);
      const result = await signUpWithEmail(email, password, username);
      setLoading(false);
      if (!result.data) {
        setError("注册失败");
      }
      return result;
    },
    []
  );

  const loginWithGitHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await signInWithGitHub();
    setLoading(false);
    return result;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();

    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await signOut();
    setLoading(false);
    navigate("/");
    return result;
  }, []);

  return {
    user: session?.user || null,
    loading,
    error,
    login,
    register,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    isAuthenticated: !!session?.user,
  };
};
