import type { MeetingType } from "@/api/meeting";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Clock3, LoaderCircle, Video } from "lucide-react";
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

/**
 * 展示会议访问状态，并保留密码校验和登录入口。
 * @param props 会议、校验状态及进入会议的操作。
 * @returns 会议访问卡片。
 */
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
    <div className="w-full max-w-md space-y-5 rounded-panel border border-border-row bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
          <Video className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-text-primary">进入会议室</h2>
          <p className="text-sm text-text-muted">
            请输入会议密码并完成身份校验。
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoaderCircle className="size-5 animate-spin text-text-muted" role="status" aria-label="正在加载会议" />
        </div>
      ) : !meeting ? (
        <div className="rounded-control bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
          未找到对应的会议房间。
        </div>
      ) : isMeetingEnded(meeting) ? (
        <div className="space-y-4">
          <div className="rounded-control border border-border-row bg-[var(--status-inbox-bg)] px-4 py-4 text-[var(--status-inbox-text)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--status-inbox-bg)] text-[var(--status-inbox-text)]">
                <Clock3 className="size-5" />
              </div>
              <div>
                <div className="font-medium">会议已结束</div>
                <div className="mt-1 text-sm text-[var(--status-inbox-text)]">
                  当前会议已超过预定结束时间，不能再进入房间。
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-control bg-bg-panel px-4 py-3">
            <div className="text-sm text-text-muted">会议主题</div>
            <div className="mt-1 font-medium text-text-primary">
              {meeting.title}
            </div>
          </div>

          <Button variant="primary" onClick={onReturnHome}>
            返回首页
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-control bg-bg-panel px-4 py-3">
            <div className="text-sm text-text-muted">会议主题</div>
            <div className="mt-1 font-medium text-text-primary">
              {meeting.title}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="meeting-access-password" className="text-sm font-medium text-text-primary">会议密码</label>
            <PasswordInput
              id="meeting-access-password"
              placeholder={
                meetingRequiresPassword(meeting)
                  ? "请输入会议密码"
                  : "该会议无密码，可直接进入"
              }
              value={password}
              disabled={!meetingRequiresPassword(meeting)}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229 && !submitting) void onSubmit(); }}
            />
            {!isAuthenticated && (
              <div className="text-xs text-[var(--status-inbox-text)]">
                当前未登录，输入密码前请先完成登录。
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 [&_button]:min-h-11">
            {!isAuthenticated && (
              <Button variant="outline" onClick={onOpenLoginModal}>登录后进入</Button>
            )}
            <Button
              variant="primary"
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
