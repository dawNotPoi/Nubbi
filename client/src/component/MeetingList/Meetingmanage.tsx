import { App, Avatar, Button, List, message, Modal, Skeleton } from "antd"
import {
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react"
import { getAllMeeting, vetMeeting } from "../../api/meeting"
import { MeetingType } from "../../type/Meeting"

import dayjs from "dayjs"

const Meetingmanage = ({ children }: PropsWithChildren) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MeetingType[]>()
  const getMeeting = useCallback(async () => {
    const res = await getAllMeeting()
    if (res.code == 1) {
      setData(res.data)
    } else {
      messageApi.error(res.message)
    }
  }, [open])
  useEffect(() => {
    getMeeting()
  }, [open])
  const handlerVet = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      const res = await vetMeeting(id, status)
      if (res.code == 1) {
        await getMeeting()
        messageApi.success("操作成功")
      } else {
        messageApi.error(res.message)
      }
    },
    [open]
  )
  return (
    <>
      {contextHolder}
      <Modal
        destroyOnClose
        open={open}
        onCancel={() => {
          setOpen(false)
        }}
        footer={null}
        title="会议审批"
      >
        <List
          style={{ maxHeight: "400px", overflow: "auto" }}
          dataSource={data}
          renderItem={(item) => (
            <List.Item
              actions={
                item.status == "unreviewd"
                  ? [
                      <Button onClick={() => handlerVet(item._id, "approved")}>
                        同意
                      </Button>,
                      <Button onClick={() => handlerVet(item._id, "rejected")}>
                        拒绝
                      </Button>,
                    ]
                  : item.status == "approved"
                  ? [<Button disabled>已通过</Button>]
                  : [<Button disabled>已拒绝</Button>]
              }
            >
              {/* <Skeleton avatar title={false} loading={item.loading} active /> */}
              <List.Item.Meta
                title={item.title}
                description={
                  <div>
                    <p>
                      {dayjs(item.createdAt).format("MM-DD HH:mm") + " ~ "}
                      {dayjs(item.createdAt)
                        .add(item.duration / 1000, "second")
                        .format("MM-DD HH:mm")}
                    </p>
                    <p></p>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
      <div className="inline-block" onClick={() => setOpen(true)}>
        {children}
      </div>
    </>
  )
}

export default memo(Meetingmanage)
