import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MeetingLobby } from "./components/meeting-lobby";
import { useLocalMedia } from "./hooks/use-local-media";
import { ActiveMeetingRoom } from "./active-meeting-room";
import type { MeetingRoomProps } from "./types";

/** @param props 会议信息。@returns 以房间为边界重置设备和入会阶段的页面。 */
export default function MeetingRoom(props: MeetingRoomProps): ReactElement {
  const { roomId = "" } = useParams();
  if (typeof MediaStream === "undefined" || typeof RTCPeerConnection === "undefined") return <div className="p-6">当前浏览器不支持音视频会议，请使用现代浏览器。</div>;
  return <PreparedMeetingRoom key={roomId} {...props} />;
}

/** @param props 会议信息。@returns 准备期间不挂载 Socket 的会议入口。 */
function PreparedMeetingRoom(props: MeetingRoomProps): ReactElement {
  const media = useLocalMedia();
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  if (!joined) return <MeetingLobby title={props.meetingTitle || ""} media={media} onJoin={() => setJoined(true)}
    onCancel={() => { media.release(); navigate("/meetings"); }} />;
  return <ActiveMeetingRoom {...props} media={media} />;
}
