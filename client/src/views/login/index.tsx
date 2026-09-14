import { AuthCodeForm } from "@/component/auth/AuthCodeForm";
import { useAuth } from "@/hooks/useAuth";
import {
  getAuthCallbackErrorMessage,
  requestPasswordReset,
  resendVerificationCode,
  resetPasswordWithCode,
  sendRegisterCode,
  verifyEmailWithCode,
} from "@/utils/auth";
import { resolveReturnTo, routes } from "@/utils/routes";
import { Alert, Button, Divider, Form, Input, Spin, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Github,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData extends LoginFormData {
  username: string;
  confirmPassword: string;
  verificationCode?: string;
}

type AuthView = "login" | "register" | "verifyEmail" | "forgotPassword";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailDomainCorrections: Record<string, string> = {
  "foxmai.com": "foxmail.com",
  "gamil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "qq.con": "qq.com",
};

const getEmailDomainCorrection = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? emailDomainCorrections[domain] : undefined;
};

const authInputClassName = "h-11 rounded-md";
const authButtonClassName = "h-11 rounded-md font-medium";
const authLabelClassName = "mb-2 text-sm font-medium text-[#37352f]";
const authIconClassName = "text-[#9b9a97]";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGitHub, loading } = useAuth();
  const [registerForm] = Form.useForm<RegisterFormData>();

  const [view, setView] = useState<AuthView>("login");
  const [socialLoginError, setSocialLoginError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [sendingRegisterCode, setSendingRegisterCode] = useState(false);
  const [registerCodeCooldown, setRegisterCodeCooldown] = useState(0);
  const [registerEmailValue, setRegisterEmailValue] = useState("");
  const [registerEmailError, setRegisterEmailError] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [requestingResetCode, setRequestingResetCode] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0);
  const [resetEmailError, setResetEmailError] = useState("");

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
  const returnTo = resolveReturnTo([queryReturnTo, stateReturnTo], routes.home);
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

  useEffect(() => {
    if (registerCodeCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setRegisterCodeCooldown((currentValue) =>
        currentValue > 0 ? currentValue - 1 : 0,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [registerCodeCooldown]);

  useEffect(() => {
    if (resetCodeCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResetCodeCooldown((currentValue) =>
        currentValue > 0 ? currentValue - 1 : 0,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resetCodeCooldown]);

  const resetForgotPasswordState = () => {
    setResetEmail("");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetCodeSent(false);
    setResetCodeCooldown(0);
    setResetEmailError("");
  };

  const resetRegisterVerificationState = () => {
    setRegisterCodeCooldown(0);
    setRegisterEmailValue("");
    setRegisterEmailError("");
    registerForm.setFieldValue("verificationCode", "");
  };

  const validateRegisterEmail = () => {
    const email = registerEmailValue.trim();

    if (!email) {
      setRegisterEmailError("请输入邮箱");
      return "";
    }

    if (!emailPattern.test(email)) {
      setRegisterEmailError("请输入有效的邮箱地址");
      return "";
    }

    const correctedDomain = getEmailDomainCorrection(email);
    if (correctedDomain) {
      setRegisterEmailError(`邮箱域名是否应为 ${correctedDomain}？`);
      return "";
    }

    setRegisterEmailError("");
    return email;
  };

  const validateResetEmail = () => {
    const email = resetEmail.trim();

    if (!email) {
      setResetEmailError("请输入邮箱");
      return "";
    }

    if (!emailPattern.test(email)) {
      setResetEmailError("请输入有效的邮箱地址");
      return "";
    }

    const correctedDomain = getEmailDomainCorrection(email);
    if (correctedDomain) {
      setResetEmailError(`邮箱域名是否应为 ${correctedDomain}？`);
      return "";
    }

    setResetEmailError("");
    return email;
  };

  const onLoginFinish = async (values: LoginFormData) => {
    const result = await login(values.email.trim(), values.password);
    if (!result.success) {
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(values.email.trim());
        setVerificationCode("");
        setView("verifyEmail");
        return;
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

    const email = validateRegisterEmail();
    if (!email) {
      message.error(registerEmailValue.trim() ? "请输入有效的邮箱地址" : "请输入邮箱");
      return;
    }

    const code = values.verificationCode?.trim() || "";
    if (!/^\d{6}$/.test(code)) {
      message.error("请输入 6 位数字验证码");
      return;
    }

    const result = await register(
      email,
      values.password,
      values.username.trim(),
      code,
    );

    if (!result.success) {
      message.error(result.error?.message || "注册失败");
      return;
    }

    registerForm.resetFields();
    resetRegisterVerificationState();
    message.success("注册成功，请登录。");
    setView("login");
  };

  const handleSendRegisterCode = async () => {
    if (sendingRegisterCode || loading) {
      return;
    }

    if (registerCodeCooldown > 0) {
      message.info(`请 ${registerCodeCooldown} 秒后再获取验证码`);
      return;
    }

    const email = validateRegisterEmail();
    if (!email) {
      message.error(registerEmailValue.trim() ? "请输入有效的邮箱地址" : "请输入邮箱");
      return;
    }

    setSendingRegisterCode(true);
    const result = await sendRegisterCode(email);
    setSendingRegisterCode(false);

    if (!result.success) {
      if (
        result.data?.emailRegistered &&
        result.data.emailVerified === false
      ) {
        setVerificationEmail(email);
        setVerificationCode("");
        setView("verifyEmail");
        setResendingVerification(true);
        const resendResult = await resendVerificationCode(email);
        setResendingVerification(false);

        if (!resendResult.success) {
          message.error(
            resendResult.error?.message ||
              "邮箱已注册但验证码重新发送失败，请稍后重试",
          );
          return;
        }

        message.success("邮箱已注册但尚未验证，验证码已重新发送。");
        return;
      }

      message.error(result.error?.message || "验证码发送失败");
      const remainingSeconds = result.data?.remainingSeconds;
      if (remainingSeconds) {
        setRegisterCodeCooldown(remainingSeconds);
      }
      return;
    }

    setRegisterCodeCooldown(result.data?.cooldownSeconds || 60);
    message.success("验证码已发送，请检查邮箱。");
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
    if (requestingResetCode || loading) {
      return;
    }

    if (resetCodeCooldown > 0) {
      message.info(`请 ${resetCodeCooldown} 秒后再获取验证码`);
      return;
    }

    const email = validateResetEmail();
    if (!email) {
      message.error(resetEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱");
      return;
    }

    setRequestingResetCode(true);
    const result = await requestPasswordReset(email);
    setRequestingResetCode(false);

    if (!result.success) {
      message.error(result.error?.message || "验证码发送失败");
      if (result.data?.remainingSeconds) {
        setResetCodeCooldown(result.data.remainingSeconds);
      }
      return;
    }

    setResetCodeSent(true);
    setResetCodeCooldown(result.data?.cooldownSeconds || 60);
    message.success("如果邮箱存在，对应验证码已发送。");
  };

  const handleResetPassword = async () => {
    const email = validateResetEmail();
    if (!email) {
      message.error(resetEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱");
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
      email,
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
          resendText="重新获取验证码"
          resendLoading={resendingVerification}
          onBack={() => setView("login")}
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
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <div className={authLabelClassName}>邮箱</div>
              <Input
                size="large"
                className={authInputClassName}
                value={resetEmail}
                placeholder="请输入邮箱"
                prefix={<Mail size={16} className={authIconClassName} />}
                status={resetEmailError ? "error" : undefined}
                onChange={(event) => {
                  setResetEmail(event.target.value);
                  if (resetEmailError) {
                    setResetEmailError("");
                  }
                }}
              />
              {resetEmailError ? (
                <div className="mt-1 text-sm text-red-500">
                  {resetEmailError}
                </div>
              ) : null}
            </div>

            <div>
              <div className={authLabelClassName}>验证码</div>
              <div className="flex gap-2">
                <Input
                  className={`${authInputClassName} min-w-0 flex-1`}
                  size="large"
                  value={resetCode}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="请输入 6 位数字验证码"
                  prefix={
                    <ShieldCheck size={16} className={authIconClassName} />
                  }
                  onChange={(event) =>
                    setResetCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
                <Button
                  htmlType="button"
                  size="large"
                  className={`${authButtonClassName} w-[112px] shrink-0`}
                  loading={requestingResetCode}
                  disabled={loading || resetCodeCooldown > 0}
                  onClick={handleSendResetCode}
                >
                  {resetCodeCooldown > 0
                    ? `${resetCodeCooldown}s`
                    : "获取验证码"}
                </Button>
              </div>
            </div>

            <div>
              <div className={authLabelClassName}>新密码</div>
              <Input.Password
                size="large"
                className={authInputClassName}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="请输入新密码"
                prefix={<KeyRound size={16} className={authIconClassName} />}
              />
            </div>

            <div>
              <div className={authLabelClassName}>确认新密码</div>
              <Input.Password
                size="large"
                className={authInputClassName}
                value={resetConfirmPassword}
                onChange={(event) => setResetConfirmPassword(event.target.value)}
                placeholder="请再次输入新密码"
                prefix={<KeyRound size={16} className={authIconClassName} />}
              />
            </div>

            {resetCodeSent ? (
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
                message="先获取验证码"
                description="输入账号邮箱后点击验证码行的获取验证码，收到邮件后直接在这里完成重置。"
              />
            )}

            <Button
              type="primary"
              size="large"
              block
              className={authButtonClassName}
              loading={submittingReset}
              onClick={handleResetPassword}
            >
              重置密码
            </Button>

            <Button
              className="h-10 rounded-md px-0 text-[#6b7280]"
              type="link"
              icon={<ArrowLeft size={16} />}
              onClick={() => {
                resetForgotPasswordState();
                setView("login");
              }}
              disabled={submittingReset || requestingResetCode}
            >
              返回
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        {view === "login" && (
          <>
            <div className="mb-6 flex flex-col items-center gap-2.5">
              <button
                type="button"
                className="grid size-12 place-items-center rounded-full border border-[#deddda] bg-white text-[#37352f] shadow-sm transition-colors hover:border-[#bdbab4] hover:bg-[#f7f7f5] hover:text-[#1f2326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3d1cb] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleGitHubLogin}
                disabled={loading}
                aria-label="使用 GitHub 登录"
              >
                {loading ? (
                  <Spin size="small" />
                ) : (
                  <Github size={22} strokeWidth={2} aria-hidden="true" />
                )}
              </button>
              <span className="text-[13px] font-medium text-[#6f6e69]">
                使用 GitHub 登录
              </span>
            </div>

            <Divider>或</Divider>
          </>
        )}

        {view === "register" ? (
          <Form
            form={registerForm}
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
              <Input
                className={authInputClassName}
                placeholder="请输入用户名"
                prefix={<UserRound size={16} className={authIconClassName} />}
              />
            </Form.Item>

            <Form.Item
              label="邮箱"
              required
              validateStatus={registerEmailError ? "error" : undefined}
              help={registerEmailError || undefined}
            >
              <Input
                className={authInputClassName}
                value={registerEmailValue}
                placeholder="请输入邮箱"
                prefix={<Mail size={16} className={authIconClassName} />}
                onChange={(event) => {
                  setRegisterEmailValue(event.target.value);
                  if (registerEmailError) {
                    setRegisterEmailError("");
                  }
                }}
              />
            </Form.Item>

            <Form.Item label="验证码" required className="mb-6">
              <div className="flex gap-2">
                <Form.Item
                  name="verificationCode"
                  noStyle
                  normalize={(value: string) =>
                    value?.replace(/\D/g, "").slice(0, 6)
                  }
                  rules={[
                    { required: true, message: "请输入验证码" },
                    {
                      pattern: /^\d{6}$/,
                      message: "请输入 6 位数字验证码",
                    },
                  ]}
                >
                  <Input
                    className={`${authInputClassName} min-w-0 flex-1`}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="请输入 6 位数字验证码"
                    prefix={
                      <ShieldCheck size={16} className={authIconClassName} />
                    }
                  />
                </Form.Item>

                <Button
                  htmlType="button"
                  className={`${authButtonClassName} w-[112px] shrink-0`}
                  onClick={handleSendRegisterCode}
                  loading={sendingRegisterCode}
                  disabled={loading || registerCodeCooldown > 0}
                >
                  {registerCodeCooldown > 0
                    ? `${registerCodeCooldown}s`
                    : "获取验证码"}
                </Button>
              </div>

              <Form.Item noStyle shouldUpdate>
                {() => {
                  const errors = registerForm.getFieldError("verificationCode");
                  return errors.length ? (
                    <div className="mt-1 text-sm text-red-500">{errors[0]}</div>
                  ) : null;
                }}
              </Form.Item>
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password
                className={authInputClassName}
                placeholder="请输入密码"
                prefix={<KeyRound size={16} className={authIconClassName} />}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              rules={[
                { required: true, message: "请再次输入密码" },
                { min: 6, message: "密码至少 6 位" },
              ]}
            >
              <Input.Password
                className={authInputClassName}
                placeholder="请再次输入密码"
                prefix={<KeyRound size={16} className={authIconClassName} />}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                className={authButtonClassName}
                loading={loading}
                disabled={sendingRegisterCode}
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
              <Input
                className={authInputClassName}
                placeholder="请输入邮箱"
                prefix={<Mail size={16} className={authIconClassName} />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                className={authInputClassName}
                placeholder="请输入密码"
                prefix={<KeyRound size={16} className={authIconClassName} />}
              />
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
                className={authButtonClassName}
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
            onClick={() => {
              if (view === "register") {
                resetRegisterVerificationState();
                registerForm.resetFields();
                setView("login");
                return;
              }

              setView("register");
            }}
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
      ? "填写邮箱验证码完成注册"
      : view === "verifyEmail"
        ? "邮箱验证完成后即可返回登录"
        : view === "forgotPassword"
          ? "输入邮箱验证码后设置新密码"
          : "欢迎回来";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-8 text-[#37352f]">
      <div className="w-full max-w-[430px] space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-md border border-[#deddda] bg-white text-[#37352f] shadow-sm">
            <KeyRound size={20} />
          </div>
          <h2 className="text-[28px] font-semibold leading-tight tracking-normal text-[#37352f]">
            {pageTitle}
          </h2>
          <p className="mt-2 text-sm text-[#6f6e69]">{pageSubtitle}</p>
        </div>

        <div className="rounded-lg border border-[#e5e2da] bg-[#fffdf9] px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-6">
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
