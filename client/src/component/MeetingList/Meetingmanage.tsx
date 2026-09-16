import { Modal } from "@/component/UI/Dialog";
import { useMeetingManage } from "./meeting-manage/use-meeting-manage";
import { MeetingManageContent } from "./meeting-manage/meeting-manage-content";
import { MeetingCommentsModal } from "./meeting-manage/meeting-comments-modal";
import clsx from "clsx";
import { memo, type PropsWithChildren, type ReactElement, useState } from "react";

type MeetingManageProps = PropsWithChildren<{
  variant?: "modal" | "page";
  className?: string;
}>;

const Meetingmanage = ({
  children,
  variant = "modal",
  className,
}: MeetingManageProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const isPage = variant === "page";
  const meetingManage = useMeetingManage(isPage || open);

  const content = (
    <MeetingManageContent
      className={clsx(
        isPage &&
          "bg-surface md:rounded-[10px] md:border md:border-border-row md:p-6 md:shadow-[0_3px_16px_rgba(55,53,47,0.04)]",
        className,
      )}
      meetings={meetingManage.meetings}
      loading={meetingManage.loading}
      currentUserId={meetingManage.currentUserId}
      stats={meetingManage.stats}
      onRefresh={meetingManage.refresh}
      onVet={meetingManage.vet}
      onJoin={meetingManage.join}
      onViewComments={meetingManage.viewComments}
      onDelete={meetingManage.remove}
    />
  );

  return (
    <>
      {isPage ? (
        content
      ) : (
        <>
          <Modal
            open={open}
            onCancel={() => setOpen(false)}
            showClose
            className="md:!mt-[5vh] md:!w-[920px]"
          >
            <div className="pt-2">{content}</div>
          </Modal>
          <div className="inline-block" onClick={() => setOpen(true)}>
            {children}
          </div>
        </>
      )}

      <MeetingCommentsModal
        open={meetingManage.commentModalOpen}
        title={meetingManage.commentMeetingTitle}
        comments={meetingManage.comments}
        loading={meetingManage.commentLoading}
        onClose={meetingManage.closeComments}
      />
    </>
  );
};

export default memo(Meetingmanage);
