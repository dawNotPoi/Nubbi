import type { MeetingType } from "@/api/meeting";
import { Button, Input, Spin } from "antd";
import { Clock3, Lock, Video } from "lucide-react";
import type { ReactElement } from "react";
import {
  isMeetingEnded,
  meetingRequiresPassword,
} from "../helpers/meeting-access";

type MeetingAccessCardProps = {
  meeting: MeetingType | null;
  password: string;
  loading: boolean;
  submitting: boolean;
  isAuthenticated: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: () => Promise<void>;
  onOpenLoginModal: () => void;
  onReturnHome: () => void;
};

export default function MeetingAccessCard({
  meeting,
  password,
  loading,
  submitting,
  isAuthenticated,
  onPasswordChange,
  onSubmit,
  onOpenLoginModal,
  onReturnHome,
}: MeetingAccessCardProps): ReactElement {
  return (
    <div className="w-full max-w-md space-y-5 rounded-panel border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-sky-50 text-sky-600">
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
        <div className="rounded-control bg-rose-50 px-4 py-3 text-sm text-rose-600">
          未找到对应的会议房间。
        </div>
      ) : isMeetingEnded(meeting) ? (
        <div className="space-y-4">
          <div className="rounded-control border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
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

          <div className="rounded-control bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-500">会议主题</div>
            <div className="mt-1 font-medium text-slate-900">
              {meeting.title}
            </div>
          </div>

          <Button type="primary" onClick={onReturnHome}>
            返回首页
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-control bg-slate-50 px-4 py-3">
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
                meetingRequiresPassword(meeting)
                  ? "请输入会议密码"
                  : "该会议无密码，可直接进入"
              }
              value={password}
              disabled={!meetingRequiresPassword(meeting)}
              onChange={(event) => onPasswordChange(event.target.value)}
              onPressEnter={() => void onSubmit()}
            />
            {!isAuthenticated && (
              <div className="text-xs text-amber-600">
                当前未登录，输入密码前请先完成登录。
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isAuthenticated && (
              <Button onClick={onOpenLoginModal}>登录后进入</Button>
            )}
            <Button
              type="primary"
              loading={submitting}
              onClick={() => void onSubmit()}
            >
              {meetingRequiresPassword(meeting)
                ? "验证并进入"
                : "直接进入会议室"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
