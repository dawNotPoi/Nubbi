import { Header } from "@/component/Header";
import Meetingmanage from "@/component/MeetingList/Meetingmanage";
import RecentMeetings from "@/component/MeetingList/RecentMeeting";
import { CreateMeetingModal } from "@/component/MeetingList/create-meeting-modal";
import { Button } from "antd";
import { Plus } from "lucide-react";
import { useState, type ReactElement } from "react";

/**
 * 渲染会议列表页，并统一承载创建、近期会议和会议管理入口。
 * @returns 会议列表页面。
 */
export default function Meetings(): ReactElement {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-w-0 bg-white text-text-primary">
      <Header className="bg-white/95" />
      <main className="px-4 pb-16 pt-4 sm:px-6 md:px-10 md:pt-7 lg:px-[68px]">
        <section className="mx-auto max-w-screen-xl space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-3xl font-bold leading-none tracking-normal text-text-primary md:text-[40px]">
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
