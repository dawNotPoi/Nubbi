import {
  getMeetingById,
  validateMeetingAccess,
  type MeetingType,
} from "@/api/meeting";
import { useAuth } from "@/hooks/useAuth";
import { toast as message } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getAccessErrorMessage,
  isMeetingEnded,
  meetingRequiresPassword,
} from "../helpers/meeting-access";

export type UseMeetingAccessResult = {
  meeting: MeetingType | null;
  password: string;
  loading: boolean;
  submitting: boolean;
  meetingAccessToken: string;
  loginModalOpen: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  setPassword: (password: string) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openLoginPage: () => void;
  loginWithGitHub: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  submitPassword: () => Promise<void>;
  rejectAccess: () => void;
  returnHome: () => void;
};

export const useMeetingAccess = (): UseMeetingAccessResult => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loginWithGitHub,
    loginWithGoogle,
    loading: authLoading,
  } = useAuth();
  const userId = user?.id;
  const [meeting, setMeeting] = useState<MeetingType | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meetingAccessToken, setMeetingAccessToken] = useState("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const loadMeeting = async (): Promise<void> => {
      setLoading(true);
      setMeetingAccessToken("");
      try {
        const response = await getMeetingById(roomId);
        if (cancelled) return;
        const nextMeeting = response.data;
        setMeeting(nextMeeting);

        if (nextMeeting && isMeetingEnded(nextMeeting)) return;
        if (!nextMeeting) {
          message.error("会议房间不存在");
          return;
        }
        if (!userId) {
          setLoginModalOpen(true);
          return;
        }
        if (!meetingRequiresPassword(nextMeeting)) {
          const accessResponse = await validateMeetingAccess(roomId);
          if (cancelled) return;
          if (
            accessResponse.data.passed &&
            accessResponse.data.accessToken
          ) {
            setMeetingAccessToken(accessResponse.data.accessToken);
          } else {
            message.error(
              getAccessErrorMessage(accessResponse.data.reason),
            );
          }
        }
      } catch {
        if (!cancelled) message.error("获取会议房间信息失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMeeting();
    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);

  useEffect(() => {
    if (userId) setLoginModalOpen(false);
  }, [userId]);

  const openLoginPage = useCallback((): void => {
    navigate("/login", { state: { from: location } });
  }, [location, navigate]);

  const rejectAccess = useCallback((): void => {
    setMeetingAccessToken("");
  }, []);

  const submitPassword = useCallback(async (): Promise<void> => {
    if (!meeting || !roomId) return;
    if (isMeetingEnded(meeting)) {
      message.warning("会议已结束");
      return;
    }
    if (!userId) {
      setLoginModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await validateMeetingAccess(roomId, password);
      if (response.data.passed && response.data.accessToken) {
        setMeetingAccessToken(response.data.accessToken);
        message.success("密码正确，正在进入会议室");
        return;
      }
      message.error(getAccessErrorMessage(response.data.reason));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "验证会议密码失败",
      );
    } finally {
      setSubmitting(false);
    }
  }, [meeting, password, roomId, userId]);

  const handleGitHubLogin = useCallback(async (): Promise<void> => {
    const result = await loginWithGitHub(window.location.href);
    if (!result.success) {
      message.error(result.error?.message || "GitHub 登录失败");
    }
  }, [loginWithGitHub]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    const result = await loginWithGoogle(window.location.href);
    if (!result.success) {
      message.error(result.error?.message || "Google 登录失败");
    }
  }, [loginWithGoogle]);

  const returnHome = useCallback((): void => {
    navigate("/home", { replace: true });
  }, [navigate]);

  return {
    meeting,
    password,
    loading,
    submitting,
    meetingAccessToken,
    loginModalOpen,
    authLoading,
    isAuthenticated: Boolean(userId),
    setPassword,
    openLoginModal: () => setLoginModalOpen(true),
    closeLoginModal: () => setLoginModalOpen(false),
    openLoginPage,
    loginWithGitHub: handleGitHubLogin,
    loginWithGoogle: handleGoogleLogin,
    submitPassword,
    rejectAccess,
    returnHome,
  };
};
