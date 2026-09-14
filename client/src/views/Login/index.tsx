import { AuthCodeForm } from "@/components/auth/AuthCodeForm";
import { useAuth } from "@/hooks/useAuth";
import {
  getAuthCallbackErrorMessage,
  requestPasswordReset,
  resendVerificationCode,
  resetPasswordWithCode,
  verifyEmailWithCode,
} from "@/utils/auth";
import { Alert, Button, Divider, Form, Input, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Github, Globe } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData extends LoginFormData {
  username: string;
  confirmPassword: string;
}

type AuthView = "login" | "register" | "verifyEmail" | "forgotPassword";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGitHub, loginWithGoogle, loading } =
    useAuth();

  const [view, setView] = useState<AuthView>("login");
  const [socialLoginError, setSocialLoginError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [requestingResetCode, setRequestingResetCode] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);

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

  const callbackError = useMemo(
    () => getAuthCallbackErrorMessage(location.search),
    [location.search],
  );

  useEffect(() => {
    if (!callbackError) return;

    setSocialLoginError(callbackError);
    message.error(callbackError);

    const params = new URLSearchParams(location.search);
    ["error", "error_description", "error_message", "message"].forEach((key) =>
      params.delete(key),
    );

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true, state: location.state },
    );
  }, [callbackError, location.pathname, location.search, location.state, navigate]);

  const resetForgotPasswordState = () => {
    setResetEmail("");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetCodeSent(false);
  };

  const onLoginFinish = async (values: LoginFormData) => {
    const result = await login(values.email, values.password);
    if (!result.success) {
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(values.email.trim());
        setVerificationCode("");
        setView("verifyEmail");
      }
      message.error(result.error?.message || "登录失败");
      return;
    }

    message.success("登录成功");
    navigate(returnTo, { replace: true });
  };

  const onRegisterFinish = async (values: RegisterFormData) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    const result = await register(
      values.email,
      values.password,
      values.username,
    );

    if (!result.success) {
      message.error(result.error?.message || "注册失败");
      return;
    }

    setVerificationEmail(values.email.trim());
    setVerificationCode("");
    setView("verifyEmail");
    message.success("注册成功，验证码已发送到您的邮箱。");
  };

  const handleVerifyEmail = async () => {
    if (!verificationEmail.trim()) {
      message.error("请输入邮箱");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      message.error("请输入 6 位数字验证码");
      return;
    }

    setVerifyingEmail(true);
    const result = await verifyEmailWithCode(
      verificationEmail.trim(),
      verificationCode.trim(),
    );
    setVerifyingEmail(false);

    if (!result.success) {
      message.error(result.error?.message || "邮箱验证失败");
      return;
    }

    message.success("邮箱验证成功，请登录。");
    setView("login");
    setVerificationCode("");
  };

  const handleResendVerification = async () => {
    if (!verificationEmail.trim()) {
      message.error("请输入邮箱");
      return;
    }

    setResendingVerification(true);
    const result = await resendVerificationCode(verificationEmail.trim());
    setResendingVerification(false);

    if (!result.success) {
      message.error(result.error?.message || "验证码发送失败");
      return;
    }

    message.success("验证码已重新发送，请检查邮箱。");
  };

  const handleSendResetCode = async () => {
    if (!resetEmail.trim()) {
      message.error("请输入邮箱");
      return;
    }

    setRequestingResetCode(true);
    const result = await requestPasswordReset(resetEmail.trim());
    setRequestingResetCode(false);

    if (!result.success) {
      message.error(result.error?.message || "验证码发送失败");
      return;
    }

    setResetCodeSent(true);
    message.success("如果邮箱存在，对应验证码已发送。");
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      message.error("请输入邮箱");
      return;
    }

    if (!/^\d{6}$/.test(resetCode.trim())) {
      message.error("请输入 6 位数字验证码");
      return;
    }

    if (resetPassword.length < 6) {
      message.error("新密码至少 6 位");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    setSubmittingReset(true);
    const result = await resetPasswordWithCode(
      resetEmail.trim(),
      resetCode.trim(),
      resetPassword,
    );
    setSubmittingReset(false);

    if (!result.success) {
      message.error(result.error?.message || "重置密码失败");
      return;
    }

    message.success("密码重置成功，请使用新密码登录。");
    resetForgotPasswordState();
    setView("login");
  };

  const handleGitHubLogin = async () => {
    const result = await loginWithGitHub(callbackURL);
    if (!result.success) {
      message.error(result.error?.message || "GitHub 登录失败");
    }
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle(callbackURL);
    if (!result.success) {
      message.error(result.error?.message || "Google 登录失败");
    }
  };

  const renderAuthContent = () => {
    if (view === "verifyEmail") {
      return (
        <AuthCodeForm
          title="输入邮箱验证码"
          description="注册成功后无需跳页，直接在这里输入邮箱里的 6 位数字验证码即可完成验证。"
          email={verificationEmail}
          code={verificationCode}
          emailReadOnly
          onEmailChange={setVerificationEmail}
          onCodeChange={setVerificationCode}
          onSubmit={handleVerifyEmail}
          submitText="完成验证"
          submitting={verifyingEmail}
          onResend={handleResendVerification}
          resendLoading={resendingVerification}
          onBack={() => setView("register")}
          hint={
            <Alert
              type="info"
              showIcon
              message="验证码已发送"
              description={`验证码已发送至 ${verificationEmail}，如果暂时没收到，可以直接点右下角重新发送。`}
            />
          }
        />
      );
    }

    if (view === "forgotPassword") {
      return (
        <AuthCodeForm
          title="找回密码"
          description="在同一页面完成发送验证码、输入验证码和设置新密码。"
          email={resetEmail}
          code={resetCode}
          onEmailChange={setResetEmail}
          onCodeChange={setResetCode}
          onSubmit={handleResetPassword}
          submitText="重置密码"
          submitting={submittingReset}
          onResend={handleSendResetCode}
          resendText={resetCodeSent ? "重新发送验证码" : "发送验证码"}
          resendLoading={requestingResetCode}
          onBack={() => {
            resetForgotPasswordState();
            setView("login");
          }}
          hint={
            resetCodeSent ? (
              <Alert
                type="success"
                showIcon
                message="验证码已发送"
                description="请输入邮箱收到的 6 位数字验证码，然后设置新密码。"
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="先发送验证码"
                description="输入注册邮箱后点击右下角发送验证码，收到邮件后直接在这里继续完成重置。"
              />
            )
          }
          extraFields={
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">
                  新密码
                </div>
                <Input.Password
                  size="large"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="请输入新密码"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">
                  确认新密码
                </div>
                <Input.Password
                  size="large"
                  value={resetConfirmPassword}
                  onChange={(event) =>
                    setResetConfirmPassword(event.target.value)
                  }
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>
          }
        />
      );
    }

    return (
      <>
        {(view === "login" || view === "register") && (
          <>
            <div className="space-y-3 mb-6">
              <Button
                type="default"
                size="large"
                block
                icon={<Github size={16} />}
                onClick={handleGitHubLogin}
                loading={loading}
              >
                使用 GitHub 登录
              </Button>

              <Button
                type="default"
                size="large"
                block
                icon={<Globe size={16} />}
                onClick={handleGoogleLogin}
                loading={loading}
              >
                使用 Google 登录
              </Button>
            </div>

            <Divider>或</Divider>
          </>
        )}

        {view === "register" ? (
          <Form
            name="register"
            onFinish={onRegisterFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: "请输入用户名" },
                { min: 3, message: "用户名至少 3 位" },
                { max: 20, message: "用户名最多 20 位" },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: "用户名只能包含字母、数字和下划线",
                },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "请输入有效的邮箱地址" },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              rules={[
                { required: true, message: "请再次输入密码" },
                { min: 6, message: "密码至少 6 位" },
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
                注册并发送验证码
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
              <Input placeholder="请输入邮箱" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>

            <div className="mb-4 flex justify-end">
              <Button
                type="link"
                className="px-0"
                onClick={() => {
                  resetForgotPasswordState();
                  setView("forgotPassword");
                }}
              >
                忘记密码？
              </Button>
            </div>

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

        <div className="text-center mt-4">
          <Button
            type="link"
            onClick={() => setView(view === "register" ? "login" : "register")}
          >
            {view === "register"
              ? "已有账号？点击登录"
              : "没有账号？点击注册"}
          </Button>
        </div>
      </>
    );
  };

  const pageTitle =
    view === "register"
      ? "注册账号"
      : view === "verifyEmail"
        ? "邮箱验证"
        : view === "forgotPassword"
          ? "找回密码"
          : "登录账号";

  const pageSubtitle =
    view === "register"
      ? "注册后直接输入验证码完成邮箱验证"
      : view === "verifyEmail"
        ? "邮箱验证完成后即可返回登录"
        : view === "forgotPassword"
          ? "无需跳转，当前页直接重置密码"
          : "欢迎回来";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="mt-2 text-sm text-gray-600">{pageSubtitle}</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {socialLoginError && (
            <Alert
              message="第三方登录失败"
              description={socialLoginError}
              type="error"
              showIcon
              closable
              onClose={() => setSocialLoginError(null)}
              style={{ marginBottom: 16 }}
            />
          )}

          {renderAuthContent()}
        </div>
      </div>
    </div>
  );
};
