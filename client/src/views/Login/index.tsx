import { useAuth } from "@/hooks/useAuth";
import { Alert, Button, Divider, Form, Input, message } from "antd";
import { useState } from "react";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData extends LoginFormData {
  username: string;
  confirmPassword: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, register, loginWithGitHub, loginWithGoogle, user, loading } =
    useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const stateFrom = (
    location.state as
      | {
          from?: {
            pathname?: string;
            search?: string;
            hash?: string;
          };
        }
      | undefined
  )?.from;
  const queryReturnTo = new URLSearchParams(location.search).get("returnTo");
  const stateReturnTo = stateFrom
    ? `${stateFrom.pathname || ""}${stateFrom.search || ""}${stateFrom.hash || ""}`
    : "";
  const returnTo =
    (queryReturnTo && queryReturnTo.startsWith("/") ? queryReturnTo : "") ||
    (stateReturnTo.startsWith("/") ? stateReturnTo : "") ||
    "/home";
  const callbackURL = `${window.location.origin}${returnTo}`;
  const onLoginFinish = async (values: LoginFormData) => {
    const result = await login(values.email, values.password);
    if (result.error) {
      message.error(result.error?.message || "登录失败");
    } else {
      message.success("登录成功！");

      navigate(returnTo, { replace: true });
    }
  };

  const onRegisterFinish = async (values: RegisterFormData) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }
    const result = await register(
      values.email,
      values.password,
      values.username
    );
    if (result.success) {
      message.success("注册成功！请检查邮箱完成验证。");
      setShowVerificationAlert(true);
      navigate(returnTo, { replace: true });
    } else {
      message.error("注册失败");
    }
  };

  const handleGitHubLogin = async () => {
    await loginWithGitHub(callbackURL);
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle(callbackURL);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isRegister ? "注册账户" : "登录账户"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRegister ? "创建您的账户" : "欢迎回来"}
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {/* 邮箱验证提示 */}
          {showVerificationAlert && (
            <Alert
              message="注册成功！"
              description="我们已向您的邮箱发送了验证链接，请检查邮箱并点击验证链接完成注册。"
              type="success"
              showIcon
              closable
              onClose={() => setShowVerificationAlert(false)}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 社交登录按钮 */}
          <div className="space-y-3 mb-6">
            <Button
              type="default"
              size="large"
              block
              icon={<FaGithub />}
              onClick={handleGitHubLogin}
              loading={loading}
            >
              使用 GitHub 登录
            </Button>

            <Button
              type="default"
              size="large"
              block
              icon={<FaGoogle />}
              onClick={handleGoogleLogin}
              loading={loading}
            >
              使用 Google 登录
            </Button>
          </div>

          <Divider>或</Divider>

          {/* 邮箱登录/注册表单 */}
          {isRegister ? (
            <Form
              name="register"
              onFinish={onRegisterFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                label="账户名"
                rules={[
                  { required: true, message: "请输入账户名" },
                  { min: 3, message: "账户名至少3位" },
                  { max: 20, message: "账户名最多20位" },
                  {
                    pattern: /^[a-zA-Z0-9_]+$/,
                    message: "账户名只能包含字母、数字和下划线",
                  },
                ]}
              >
                <Input placeholder="请输入您的账户名" />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: "请输入邮箱" },
                  { type: "email", message: "请输入有效的邮箱地址" },
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: "请输入密码" },
                  { min: 6, message: "密码至少6位" },
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认密码"
                rules={[
                  { required: true, message: "请确认密码" },
                  { min: 6, message: "密码至少6位" },
                ]}
              >
                <Input.Password placeholder="请再次输入密码" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              name="login"
              onFinish={onLoginFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: "请输入邮箱" },
                  { type: "email", message: "请输入有效的邮箱地址" },
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          )}

          {/* 切换登录/注册 */}
          <div className="text-center mt-4">
            <Button type="link" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? "已有账户？点击登录" : "没有账户？点击注册"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
