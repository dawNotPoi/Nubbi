import { resetPasswordWithCode } from "@/utils/auth";
import { Alert, Button, Form, Input, message } from "antd";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthCardHeader } from "../login/AuthCardHeader";

interface ResetPasswordFormData {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

/**
 * 处理带邮箱验证码的独立密码重置流程。
 * @returns 与 Nubbi 视觉体系一致的密码重置页面。
 */
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

  /**
   * 校验并提交密码重置请求。
   * @param values 表单中的邮箱、验证码和两次密码输入。
   * @returns 无返回值。
   */
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
    <div className="auth-form">
        <AuthCardHeader
          title={resetDone ? "密码已更新" : "设置新的密码"}
          description={resetDone ? "现在可以使用新密码登录，继续收好你的灵感。" : "请输入注册邮箱、邮件里的 6 位数字验证码，以及你的新密码。"}
        />

        {resetDone ? (
          <div className="space-y-4">
            <Alert
              type="success"
              showIcon
              message="密码已更新"
              description="现在可以返回登录页，使用新密码重新登录。"
            />
            <Button className="h-11 rounded-control" type="primary" block onClick={() => navigate("/login")}>
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
              <Input className="rounded-control" placeholder="请输入注册邮箱" />
            </Form.Item>

            <Form.Item
              name="code"
              label="6 位验证码"
              rules={[
                { required: true, message: "请输入邮件中的验证码" },
                {
                  pattern: /^\d{6}$/,
                  message: "请输入 6 位数字验证码",
                },
              ]}
            >
              <Input
                className="rounded-control text-center tracking-[0.22em]"
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
                { min: 8, message: "密码至少 8 位" },
              ]}
            >
              <Input.Password className="rounded-control" placeholder="请输入新密码" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              rules={[
                { required: true, message: "请再次输入新密码" },
                { min: 8, message: "密码至少 8 位" },
              ]}
            >
              <Input.Password className="rounded-control" placeholder="请再次输入新密码" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                className="h-11 rounded-control"
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
  );
};
