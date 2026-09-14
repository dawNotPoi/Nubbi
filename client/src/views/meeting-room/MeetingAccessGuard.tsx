import VideoPage from "@/views/meeting-room";
import type { ReactElement } from "react";
import MeetingAccessCard from "./components/MeetingAccessCard";
import MeetingLoginModal from "./components/MeetingLoginModal";
import { useMeetingAccess } from "./hooks/use-meeting-access";

const MeetingAccessGuard = (): ReactElement => {
  const access = useMeetingAccess();

  if (access.meetingAccessToken) {
    return (
      <VideoPage
        meetingTitle={access.meeting?.title || ""}
        meetingHostId={access.meeting?.hostId || ""}
        meetingStartTime={access.meeting?.startTime}
        meetingAccessToken={access.meetingAccessToken}
        onAccessRejected={access.rejectAccess}
      />
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4 sm:p-6">
      <MeetingLoginModal
        open={access.loginModalOpen}
        loading={access.authLoading}
        onClose={access.closeLoginModal}
        onOpenLoginPage={access.openLoginPage}
        onGitHubLogin={access.loginWithGitHub}
        onGoogleLogin={access.loginWithGoogle}
      />
      <MeetingAccessCard
        meeting={access.meeting}
        password={access.password}
        loading={access.loading}
        submitting={access.submitting}
        isAuthenticated={access.isAuthenticated}
        onPasswordChange={access.setPassword}
        onSubmit={access.submitPassword}
        onOpenLoginModal={access.openLoginModal}
        onReturnHome={access.returnHome}
      />
    </div>
  );
};

export default MeetingAccessGuard;
