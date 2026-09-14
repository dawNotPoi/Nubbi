import { Button, DatePicker, Form, Input, Modal, Select } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import dayjs, { Dayjs } from "dayjs"
import { useState } from "react"
import { createMeeting } from "../../api/meeting"

export default function AddMeeting({ children }) {
  const [visible, setVisible] = useState(false)
  const [form] = useForm()
  const SubmitForm = ({ onSubmit, hostName }) => {
    return (
      <Form
        form={form}
        onFinish={(v: {
          title: string
          startTime: Dayjs
          duration: number
        }) => {
          onSubmit({
            ...v,
            startTime: v.startTime.toDate(),
          })
        }}
      >
        <FormItem
          label="会议标题"
          initialValue={hostName + "的会议"}
          name="title"
          rules={[{ required: true }]}
        >
          <Input></Input>
        </FormItem>
        <FormItem
          label="开始时间"
          name="startTime"
          initialValue={dayjs()}
          rules={[{ required: true }]}
        >
          <DatePicker minDate={dayjs()} className="w-full" showTime />
        </FormItem>
        <FormItem
          label="会议时长"
          name="duration"
          initialValue={60 * 30 * 1000}
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value={60 * 30 * 1000}>30分钟</Select.Option>
            <Select.Option value={60 * 60 * 1000}>1小时</Select.Option>
            <Select.Option value={60 * 60 * 2 * 1000}>2小时</Select.Option>
          </Select>
        </FormItem>
      </Form>
    )
  }

  return (
    <div>
      <div
        onClick={() => {
          setVisible(true)
        }}
      >
        {children}
      </div>
      <Modal
        title="添加会议"
        onOk={() => {
          setVisible(false)
          form.submit()
        }}
        onCancel={() => setVisible(false)}
        open={visible}
      >
        <SubmitForm
          onSubmit={(v) => {
            console.log(v)
            createMeeting({
              title: v.title,
              startTime: v.startTime,
              duration: v.duration,
              hostId: "dawn",
            })
          }}
          hostName={"dawn"}
        ></SubmitForm>{" "}
      </Modal>
    </div>
  )
}
