import { Header } from "@/component/Header";
import MobileSecondaryHeader from "@/component/MobileSecondaryHeader";
import Meetingmanage from "@/component/MeetingList/Meetingmanage";
import RecentMeetings from "@/component/MeetingList/RecentMeeting";
import { CreateMeetingModal } from "@/component/MeetingList/create-meeting-modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "antd";
import { Plus } from "lucide-react";
import { useState, type ReactElement } from "react";

/** 会议列表页；Mobile 使用二级页 Header，Desktop 保留工作区布局。 */
export default function Meetings(): ReactElement {
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-w-0 bg-surface text-text-primary">
      {isMobile ? (
        <MobileSecondaryHeader
          title="会议"
          action={
            <button
              aria-label="创建会议"
              className="grid size-11 place-items-center rounded-[8px] text-[var(--brand)] transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <Plus className="size-5" />
            </button>
          }
        />
      ) : (
        <Header className="bg-surface/95" />
      )}

      <main className="px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4 sm:px-6 md:px-10 md:pb-16 md:pt-7 lg:px-[68px]">
        <section className="mx-auto max-w-screen-xl space-y-7 md:space-y-8">
          {!isMobile ? (
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="text-3xl font-semibold leading-none tracking-[-0.015em] text-text-primary md:text-[40px]">
                  Meetings
                </h1>
                <p className="mt-3 text-sm text-text-muted">
                  管理会议安排、审批状态与历史记录。
                </p>
              </div>
              <Button
                className="h-9 rounded-md px-4 font-medium"
                icon={<Plus size={16} />}
                onClick={() => setCreateOpen(true)}
                type="primary"
              >
                创建会议
              </Button>
            </div>
          ) : null}

          <RecentMeetings showCreateAction={false} />
          <Meetingmanage variant="page" />
        </section>
      </main>

      <CreateMeetingModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </div>
  );
}
