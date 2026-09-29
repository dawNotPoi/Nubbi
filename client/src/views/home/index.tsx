import { Header } from "@/component/Header";
import RecentMeeting from "@/component/MeetingList/RecentMeeting";
import { CreateMeetingModal } from "@/component/MeetingList/create-meeting-modal";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { Button } from "@/components/ui/button";
import { FileUploadButton } from "@/features/file/components/FileUploadButton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import type { ReactElement } from "react";
import MobileHome from "./MobileHome";
import RecentNoteList from "./RecentNoteList";
import { useHomeActions } from "./useHomeActions";

/**
 * 桌面首页以内容书架承载最近笔记，工具栏复用真实业务入口。
 * @returns 桌面工作台。
 */
function DesktopHome(): ReactElement {
  const actions = useHomeActions();
  return (
    <div className="home-workspace min-h-full bg-surface text-text-primary">
      <Header className="bg-surface/95">
        <span className="flex items-center gap-2 px-3 text-xs text-text-muted">工作台 <ChevronRight className="size-3.5" /></span>
      </Header>
      <main className="mx-auto max-w-[1120px] space-y-8 px-7 pb-14 pt-5 lg:px-10 lg:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
          <div>
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight">我的空间</h1>
            <p className="mt-2 text-sm text-text-muted">收好想法，随时继续。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5" aria-label="快捷操作">
            <Button variant="primary" size="lg" icon={<Plus />} loading={actions.creating} onClick={actions.createNote}>新建笔记</Button>
            <FileUploadButton onSelect={actions.uploadFiles} className="h-9 [&_svg]:text-[var(--workspace-upload)]" />
            <Button variant="outline" size="lg" icon={<CalendarDays className="text-[var(--entity-meeting)]" />} onClick={() => actions.setMeetingOpen(true)}>创建会议</Button>
          </div>
        </div>
        <RecentNoteList />
        <RecentMeeting cards showCreateAction={false} />
      </main>
      <CreateMeetingModal open={actions.meetingOpen} onClose={() => actions.setMeetingOpen(false)} />
      <UploadListWrapper open={actions.uploadOpen} onClose={() => actions.setUploadOpen(false)} />
    </div>
  );
}

/**
 * 按设备选择独立交互模型，手机继续使用列表和底部导航。
 * @returns 首页。
 */
export default function Home(): ReactElement {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <DesktopHome />;
}
