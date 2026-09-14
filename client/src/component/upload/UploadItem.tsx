import { Button, Progress } from "antd";
import { useAtomValue } from "jotai";
import { uploadTaskAtomFamily } from "../../store/atom/FileAtom";

const UploadItem = ({ id }: { id: string }) => {
  const task = useAtomValue(uploadTaskAtomFamily(id));
  return (
    <div className="upload-item py-2 space-y-2">
      <header>{task?.name}</header>
      <Progress percent={task?.progress} />
      <footer className="flex gap-4">
        <Button onClick={() => task?.instance.pause()}>开始</Button>
        <Button onClick={() => task?.instance.pause()}>暂停</Button>
      </footer>
    </div>
  );
};
export default UploadItem;
