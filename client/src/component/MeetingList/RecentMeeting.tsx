import { Modal } from "@/component/UI/Dialog";
import { createMeetingAtom, MeetingAtom } from "@/store/atom/meetingAtom";
import { Button, DatePicker, Input, message, Select } from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { Calendars, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CardWrapper from "../../views/Home/CardWrapper";

const AddMeetingModal = ({
  open,
  onClose,
  openModal,
}: {
  open: boolean;
  onClose: () => void;
  openModal: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    startTime: dayjs().valueOf(),
    duration: 30,
    password: "",
  });
  const creteMeetingMutation = useAtomValue(createMeetingAtom);
  const createMeeting = () => {
    creteMeetingMutation.mutate(formData, {
      onError: (error) => {
        message.error("网络异常");
      },
      onSuccess: (res) => {
        message.success("创建会议成功");
      },
    });
  };
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={() => {
        createMeeting();
      }}
      okText="确定"
      showClose
      className="mt-[50vh] translate-y-[-50%]"
      trigger={
        <button
          onClick={openModal}
          className=" bg-sky-600 p-0.5 rounded-[20%] text-white "
        >
          <Plus size={20} />
        </button>
      }
    >
      <div>
        <header className="text-[20px] font-bold">添加会议</header>
        <form className="mt-2 space-y-2">
          <section className="flex gap-4 items-center">
            <div>标题</div>
            <div className="flex-1">
              <Input
                placeholder="请输入会议标题"
                onChange={(e) =>
                  setFormData((v) => ({
                    ...v,
                    title: e.target.value,
                  }))
                }
              />
            </div>
          </section>
          <section className="flex gap-4  items-center">
            <div>开始</div>
            <div className="flex-1">
              <DatePicker
                className="w-full"
                defaultValue={dayjs(formData.startTime)}
                showTime
                showMinute
                showHour
                onChange={(val) => {
                  const date = dayjs(val);
                  setFormData((v) => ({
                    ...v,
                    startTime: date.valueOf(),
                  }));
                }}
              />
            </div>
          </section>
          <section className="flex gap-4  items-center">
            <div>时间</div>
            <div className="flex-1">
              <Select
                value={formData.duration}
                onChange={(val) =>
                  setFormData((v) => ({
                    ...v,
                    duration: val,
                  }))
                }
                className="w-full"
                options={[
                  {
                    label: "30分钟",
                    value: 30,
                  },
                  {
                    label: "45分钟",
                    value: 30,
                  },
                  {
                    label: "1小时",
                    value: 60,
                  },
                  {
                    label: "2小时",
                    value: 120,
                  },
                ]}
              />
            </div>
          </section>
          <section className="flex gap-4 items-center">
            <div>密码</div>
            <div className="flex-1">
              <Input.Password
                placeholder="可选，留空表示无密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData((v) => ({
                    ...v,
                    password: e.target.value,
                  }))
                }
              />
            </div>
          </section>
        </form>
      </div>
    </Modal>
  );
};
const RecentMeetings = ({ className }: { className?: string }) => {
  const { data: meetings } = useAtomValue(MeetingAtom);
  const [open, setOpen] = useState(false);
  const NoCotent = () => {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="flex flex-col gap-4 items-center text-zinc-500">
          <Calendars size={60} />
          <p>近三天内没有会议</p>
          <div>
            <button className="text-sky-700 flex gap-1 items-center">
              <Plus size={20} />
              <span
                onClick={() => {
                  setOpen(true);
                }}
              >
                创建会议
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const turnIntoWeek = (weekDay: number) => {
    switch (weekDay) {
      case 1:
        return "星期一";
      case 2:
        return "星期二";
      case 3:
        return "星期三";
      case 4:
        return "星期四";
      case 5:
        return "星期五";
      case 6:
        return "星期六";
      case 7:
        return "星期日";
      default:
        return "";
    }
  };

  const naviagte = useNavigate();
  const navigateToMeeting = (meetingId: string) => {
    naviagte(`/meeting/${meetingId}`);
  };
  return (
    <>
      <CardWrapper
        className={className}
        header={
          <div className="flex w-full  items-center gap-2">
            <Calendars /> <span>最近会议</span>
            <div className="flex-1"></div>
            <AddMeetingModal
              openModal={() => setOpen(true)}
              open={open}
              onClose={() => setOpen(false)}
            />
          </div>
        }
      >
        <div className="max-h-[400px] border overflow-y-auto rounded-md ">
          {meetings?.length && meetings.length > 0 ? (
            meetings?.map((item) => (
              <div key={item._id} className="p-2 flex gap-1">
                <div className="p-2 w-[200px]">
                  {turnIntoWeek(dayjs(item.startTime).day())}
                  <span className="ml-2">
                    {dayjs(item.startTime).format("MM-DD")}
                  </span>
                </div>
                <div className="bg-sky-500 w-1 rounded-xl mx-1"></div>
                <div className="flex-1 flex cursor-pointer group hover:bg-zinc-50 rounded-md py-2 px-2">
                  <div className="flex-1">
                    <p>{item.title}</p>
                    <span className="text-zinc-500 text-[14px] mt-4">
                      {dayjs(item.startTime).format("hh:ss")}-
                      {dayjs(item.startTime)
                        .add(item.duration, "minute")
                        .format("hh:ss")}
                    </span>
                  </div>
                  <div className=" items-center hidden group-[:hover]:flex">
                    <Button
                      onClick={() => {
                        navigateToMeeting(item._id);
                      }}
                    >
                      进入会议
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <NoCotent />
          )}
        </div>
      </CardWrapper>
    </>
  );
};

export default RecentMeetings;
