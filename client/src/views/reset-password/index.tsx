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
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-[max(24px,env(safe-area-inset-top))]">
      <div className="w-full max-w-[420px] rounded-[12px] border border-border-row bg-surface p-6 shadow-[0_8px_30px_rgba(55,53,47,0.06)] sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-text-primary">
            输入验证码重置密码
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-text-muted">
            请输入注册邮箱、邮件里的 6 位数字验证码，以及你的新密码。
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
            <Button className="h-11 rounded-[8px]" type="primary" block onClick={() => navigate("/login")}>
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
              <Input className="rounded-[8px]" placeholder="请输入注册邮箱" />
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
                className="rounded-[8px] text-center tracking-[0.22em]"
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
              <Input.Password className="rounded-[8px]" placeholder="请输入新密码" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              rules={[
                { required: true, message: "请再次输入新密码" },
                { min: 8, message: "密码至少 8 位" },
              ]}
            >
              <Input.Password className="rounded-[8px]" placeholder="请再次输入新密码" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                className="h-11 rounded-[8px]"
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
