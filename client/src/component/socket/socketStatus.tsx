// import { socketAtom } from "@/store/"
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { socketAtom } from "../../store/atom/socketAtom";
export const SocketStatus = () => {
  const { instance: socket } = useAtomValue(socketAtom);
  const [usersCount, setUserCount] = useState(0);
  const connected = socket?.connected;
  useEffect(() => {
    socket?.on("updateUsersCount", (count) => {
      console.log("updateUserCount");
      setUserCount(count);
    });
    return () => {
      socket?.off("updateUserCount");
    };
  }, [socket]);

  const close = () => {
    socket?.close();
  };
  const open = () => {
    socket?.connect();
  };
  return (
    <div className="cursor-pointer">
      {connected ? (
        <span onClick={close} style={{ color: "green" }}>
          ●已连接 {usersCount}人
        </span>
      ) : (
        <span onClick={open} style={{ color: "red" }}>
          ●未连接
        </span>
      )}
    </div>
  );
};
