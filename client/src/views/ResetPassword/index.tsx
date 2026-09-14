import { resetPasswordWithCode } from "@/utils/auth";
import { Alert, Button, Form, Input, message } from "antd";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ResetPasswordFormData {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const initialValues = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      email: params.get("email") || "",
      code: params.get("code") || "",
    };
  }, [location.search]);

  const handleSubmit = async (values: ResetPasswordFormData) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    const result = await resetPasswordWithCode(
      values.email.trim(),
      values.code.trim(),
      values.password,
    );
    setSubmitting(false);

    if (!result.success) {
      message.error(result.error?.message || "重置密码失败");
      return;
    }

    setResetDone(true);
    message.success("密码重置成功，请使用新密码登录。");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            输入验证码重置密码
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            请输入注册邮箱、邮件里的 6 位数字验证码，以及您的新密码。
          </p>
        </div>

        {resetDone ? (
          <div className="space-y-4">
            <Alert
              type="success"
              showIcon
              message="密码已更新"
              description="现在可以返回登录页，使用新密码重新登录。"
            />
            <Button type="primary" block onClick={() => navigate("/login")}>
              返回登录
            </Button>
          </div>
        ) : (
          <Form
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            initialValues={initialValues}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: "请输入注册邮箱" },
                { type: "email", message: "请输入有效的邮箱地址" },
              ]}
            >
              <Input placeholder="请输入注册邮箱" />
            </Form.Item>

            <Form.Item
              name="code"
              label="6位验证码"
              rules={[
                { required: true, message: "请输入邮件中的验证码" },
                {
                  pattern: /^\d{6}$/,
                  message: "请输入 6 位数字验证码",
                },
              ]}
            >
              <Input
                maxLength={6}
                inputMode="numeric"
                placeholder="请输入 6 位数字验证码"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="新密码"
              rules={[
                { required: true, message: "请输入新密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              rules={[
                { required: true, message: "请再次输入新密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={submitting}
              >
                确认重置
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  );
};
