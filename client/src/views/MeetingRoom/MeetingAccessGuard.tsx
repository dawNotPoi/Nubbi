import {
  getMeetingById,
  validateMeetingAccess,
  type MeetingType,
} from "@/api/meeting";
import { Modal } from "@/component/UI/Dialog";
import { useAuth } from "@/hooks/useAuth";
import VideoPage from "@/views/MeetingRoom";
import { Button, Input, Spin, message } from "antd";
import { Clock3, Lock, LogIn, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const getMeetingAccessKey = (roomId: string) => `meeting-access:${roomId}`;
const isMeetingEnded = (meeting: MeetingType) =>
  Boolean(meeting.endedAt) ||
  Date.now() >= new Date(meeting.startTime).getTime() + meeting.duration * 60 * 1000;

const MeetingAccessGuard = () => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loginWithGitHub,
    loginWithGoogle,
    loading: authLoading,
  } = useAuth();

  const [meeting, setMeeting] = useState<MeetingType | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [granted, setGranted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const accessKey = useMemo(() => getMeetingAccessKey(roomId), [roomId]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadMeeting = async () => {
      setLoading(true);
      try {
        const response = await getMeetingById(roomId);
        if (cancelled) return;

        const nextMeeting = response.data;
        setMeeting(nextMeeting);

        if (nextMeeting && isMeetingEnded(nextMeeting)) {
          return;
        }

        if (!nextMeeting) {
          message.error("会议房间不存在");
          return;
        }

        const hasAccess =
          window.sessionStorage.getItem(accessKey) === "granted";
        if (hasAccess) {
          setGranted(true);
          return;
        }

        if (!user) {
          setShowLoginModal(true);
          return;
        }

        if (!nextMeeting.password) {
          window.sessionStorage.setItem(accessKey, "granted");
          setGranted(true);
        }
      } catch {
        if (!cancelled) message.error("获取会议房间信息失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMeeting();

    return () => {
      cancelled = true;
    };
  }, [accessKey, roomId, user]);

  const handleOpenLoginPage = () => {
    navigate("/login", { state: { from: location } });
  };

  const handleSubmitPassword = async () => {
    if (!meeting || !roomId) return;

    if (isMeetingEnded(meeting)) {
      message.warning("会议已结束");
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!meeting.password) {
      window.sessionStorage.setItem(accessKey, "granted");
      setGranted(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await validateMeetingAccess(roomId, password);
      if (response.data.passed) {
        window.sessionStorage.setItem(accessKey, "granted");
        setGranted(true);
        message.success("密码正确，正在进入会议室");
        return;
      }

      message.error("会议密码错误");
    } catch {
      message.error("验证会议密码失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (granted) {
    return (
      <VideoPage
        meetingTitle={meeting?.title || ""}
        meetingHostId={meeting?.hostId || ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Modal
        open={showLoginModal}
        onCancel={() => setShowLoginModal(false)}
        showClose
        className="mt-[20vh] w-[min(90vw,420px)]"
      >
        <div className="py-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">请先登录</h3>
            <p className="text-sm text-slate-500 mt-1">
              登录后才能校验会议房间权限并进入会议室。
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              icon={<LogIn className="size-4" />}
              onClick={handleOpenLoginPage}
            >
              前往登录页
            </Button>
            <Button
              loading={authLoading}
              onClick={() => loginWithGitHub(window.location.href)}
            >
              使用 GitHub 登录
            </Button>
            <Button
              loading={authLoading}
              onClick={() => loginWithGoogle(window.location.href)}
            >
              使用 Google 登录
            </Button>
          </div>
        </div>
      </Modal>

      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Video className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">进入会议室</h2>
            <p className="text-sm text-slate-500">
              请输入会议密码并完成身份校验。
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : !meeting ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            未找到对应的会议房间。
          </div>
        ) : meeting && isMeetingEnded(meeting) ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <div className="font-medium">会议已结束</div>
                  <div className="mt-1 text-sm text-amber-700">
                    当前会议已超过预定结束时间，不能再进入房间。
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">会议主题</div>
              <div className="mt-1 font-medium text-slate-900">
                {meeting.title}
              </div>
            </div>

            <Button
              type="primary"
              onClick={() => navigate("/home", { replace: true })}
            >
              返回首页
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">会议主题</div>
              <div className="mt-1 font-medium text-slate-900">
                {meeting.title}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">会议密码</div>
              <Input.Password
                prefix={<Lock className="size-4 text-slate-400" />}
                placeholder={
                  meeting.password
                    ? "请输入会议密码"
                    : "该会议无密码，可直接进入"
                }
                value={password}
                disabled={!meeting.password}
                onChange={(event) => setPassword(event.target.value)}
                onPressEnter={handleSubmitPassword}
              />
              {!user && (
                <div className="text-xs text-amber-600">
                  当前未登录，输入密码前请先完成登录。
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!user && (
                <Button onClick={() => setShowLoginModal(true)}>
                  登录后进入
                </Button>
              )}
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmitPassword}
              >
                {meeting.password ? "验证并进入" : "直接进入会议室"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MeetingAccessGuard;
