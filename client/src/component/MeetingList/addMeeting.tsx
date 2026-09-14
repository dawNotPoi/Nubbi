import { DatePicker, Form, FormInstance, Input, Modal, Select } from "antd";
import { useForm } from "antd/es/form/Form";
import FormItem from "antd/es/form/FormItem";
import dayjs, { Dayjs } from "dayjs";
import { ReactNode, useState } from "react";
import { createMeeting } from "../../api/meeting";

type MeetingFormValues = {
  title: string;
  startTime: Dayjs;
  duration: number;
};

type SubmitValues = Omit<MeetingFormValues, "startTime"> & {
  startTime: Date;
};

function SubmitForm({
  form,
  hostName,
  onSubmit,
}: {
  form: FormInstance<MeetingFormValues>;
  hostName: string;
  onSubmit: (values: SubmitValues) => void;
}) {
  return (
    <Form
      form={form}
      onFinish={(values: MeetingFormValues) => {
        onSubmit({
          ...values,
          startTime: values.startTime.toDate(),
        });
      }}
    >
      <FormItem
        label="会议标题"
        initialValue={`${hostName}的会议`}
        name="title"
        rules={[{ required: true }]}
      >
        <Input />
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
        initialValue={30}
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value={30}>30分钟</Select.Option>
          <Select.Option value={60}>1小时</Select.Option>
          <Select.Option value={120}>2小时</Select.Option>
        </Select>
      </FormItem>
    </Form>
  );
}

export default function AddMeeting({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [form] = useForm<MeetingFormValues>();

  return (
    <div>
      <div onClick={() => setVisible(true)}>{children}</div>
      <Modal
        title="添加会议"
        onOk={() => {
          setVisible(false);
          form.submit();
        }}
        onCancel={() => setVisible(false)}
        open={visible}
      >
        <SubmitForm
          form={form}
          onSubmit={(values) => {
            createMeeting({
              title: values.title,
              startTime: values.startTime.getTime(),
              duration: values.duration,
            });
          }}
          hostName="dawn"
        />
      </Modal>
    </div>
  );
}
