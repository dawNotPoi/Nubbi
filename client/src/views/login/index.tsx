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
import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import faviconSvg from "/favicon.svg";
import { Button } from "@/component/UI/button";
import { Input } from "@/component/UI/input";
import { PasswordInput } from "@/component/UI/password-input";
import { Label } from "@/component/UI/label";
import { Separator } from "@/component/UI/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/component/UI/card";

type AuthView = "login" | "register" | "verifyEmail" | "forgotPassword";
type VerificationIntent = "login" | "registration" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailDomainCorrections: Record<string, string> = {
  "foxmai.com": "foxmail.com", "gamil.com": "gmail.com",
  "gmail.con": "gmail.com", "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com", "qq.con": "qq.com",
};

const getEmailDomainCorrection = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? emailDomainCorrections[domain] : undefined;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGitHub, loading } = useAuth();

  const [view, setView] = useState<AuthView>("login");
  const [socialLoginError, setSocialLoginError] = useState<string | null>(null);

  /* login */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* register */
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [sendingRegisterCode, setSendingRegisterCode] = useState(false);
  const [registerCodeCooldown, setRegisterCodeCooldown] = useState(0);
  const [registerEmailError, setRegisterEmailError] = useState("");

  /* verifyEmail */
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationIntent, setVerificationIntent] =
    useState<VerificationIntent>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [verificationCodeCooldown, setVerificationCodeCooldown] = useState(0);

  /* forgotPassword */
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [requestingResetCode, setRequestingResetCode] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0);
  const [resetEmailError, setResetEmailError] = useState("");

  /* ── routing ── */
  const stateFrom = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | undefined)?.from;
  const queryReturnTo = new URLSearchParams(location.search).get("returnTo");
  const stateReturnTo = stateFrom ? `${stateFrom.pathname || ""}${stateFrom.search || ""}${stateFrom.hash || ""}` : "";
  const returnTo = resolveReturnTo([queryReturnTo, stateReturnTo], routes.home);
  const callbackURL = `${window.location.origin}${returnTo}`;
  const callbackError = useMemo(() => getAuthCallbackErrorMessage(location.search), [location.search]);

  useEffect(() => {
    if (!callbackError) return;
    setSocialLoginError(callbackError);
    const params = new URLSearchParams(location.search);
    ["error", "error_description", "error_message", "message"].forEach(k => params.delete(k));
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true, state: location.state });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── cooldown timers ── */
  useEffect(() => {
    if (registerCodeCooldown <= 0) return;
    const t = window.setTimeout(() => setRegisterCodeCooldown(c => c > 0 ? c - 1 : 0), 1000);
    return () => window.clearTimeout(t);
  }, [registerCodeCooldown]);

  useEffect(() => {
    if (resetCodeCooldown <= 0) return;
    const t = window.setTimeout(() => setResetCodeCooldown(c => c > 0 ? c - 1 : 0), 1000);
    return () => window.clearTimeout(t);
  }, [resetCodeCooldown]);

  useEffect(() => {
    if (verificationCodeCooldown <= 0) return;
    const t = window.setTimeout(() => setVerificationCodeCooldown(c => c > 0 ? c - 1 : 0), 1000);
    return () => window.clearTimeout(t);
  }, [verificationCodeCooldown]);

  /* ── validators ── */
  const validateRegisterEmail = () => {
    const email = regEmail.trim();
    if (!email) { setRegisterEmailError("请输入邮箱"); return ""; }
    if (!emailPattern.test(email)) { setRegisterEmailError("请输入有效的邮箱地址"); return ""; }
    const d = getEmailDomainCorrection(email);
    if (d) { setRegisterEmailError(`邮箱域名是否应为 ${d}？`); return ""; }
    setRegisterEmailError(""); return email;
  };

  const validateResetEmail = () => {
    const email = resetEmail.trim();
    if (!email) { setResetEmailError("请输入邮箱"); return ""; }
    if (!emailPattern.test(email)) { setResetEmailError("请输入有效的邮箱地址"); return ""; }
    const d = getEmailDomainCorrection(email);
    if (d) { setResetEmailError(`邮箱域名是否应为 ${d}？`); return ""; }
    setResetEmailError(""); return email;
  };

  const resetRegisterFields = () => {
    setRegUsername(""); setRegEmail(""); setRegCode("");
    setRegPassword(""); setRegConfirmPassword("");
    setRegisterEmailError(""); setRegisterCodeCooldown(0);
  };

  const resetForgotFields = () => {
    setResetEmail(""); setResetCode(""); setResetPassword("");
    setResetConfirmPassword(""); setResetCodeSent(false);
    setResetCodeCooldown(0); setResetEmailError("");
  };

  /* ── login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    if (!emailPattern.test(email)) {
      message.error("请输入有效的邮箱地址");
      return;
    }
    if (!loginPassword) {
      message.error("请输入密码");
      return;
    }

    setLoginEmail(email);
    const result = await login(email, loginPassword);
    if (!result.success) {
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(email);
        setVerificationCode("");
        setVerificationIntent("login");
        // better-auth（1.2.5）在密码正确但邮箱未验证时，会先发送验证码再抛
        // EMAIL_NOT_VERIFIED。此处不能再调重发接口（必撞 60s 冷却），只同步倒计时。
        setVerificationCodeSent(true);
        setVerificationCodeCooldown(60);
        setView("verifyEmail");
        return;
      }
      message.error(result.error?.message || "登录失败"); return;
    }
    message.success("登录成功"); navigate(returnTo, { replace: true });
  };

  /* ── register ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = regUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { message.error("用户名需为 3-20 位字母、数字或下划线"); return; }
    const email = validateRegisterEmail();
    if (!email) return;
    if (!/^\d{6}$/.test(regCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    if (regPassword.length < 8) { message.error("密码至少 8 位"); return; }
    if (regPassword !== regConfirmPassword) { message.error("两次输入的密码不一致"); return; }
    const result = await register(email, regPassword, username, regCode.trim());
    if (!result.success) { message.error(result.error?.message || "注册失败"); return; }
    resetRegisterFields();
    message.success("注册成功，请登录。"); setView("login");
  };

  const handleSendRegisterCode = async () => {
    if (sendingRegisterCode || loading) return;
    if (registerCodeCooldown > 0) { message.info(`请 ${registerCodeCooldown} 秒后再获取验证码`); return; }
    const email = validateRegisterEmail();
    if (!email) return;
    setSendingRegisterCode(true);
    const result = await sendRegisterCode(email);
    setSendingRegisterCode(false);
    if (!result.success) {
      if (result.data?.emailRegistered && result.data.emailVerified === false) {
        setVerificationEmail(email);
        setVerificationCode("");
        setVerificationIntent("registration");
        setView("verifyEmail");
        await sendVerificationCodeTo(email, "邮箱已注册但尚未验证，验证码已重新发送。");
        return;
      }
      message.error(result.error?.message || "验证码发送失败");
      if (result.data?.remainingSeconds) setRegisterCodeCooldown(result.data.remainingSeconds);
      return;
    }
    setRegisterCodeCooldown(result.data?.cooldownSeconds || 60);
    message.success("验证码已发送，请检查邮箱。");
  };

  /* ── verifyEmail ── */
  const handleVerifyEmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(verificationCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    setVerifyingEmail(true);
    const email = verificationEmail.trim();
    const result = await verifyEmailWithCode(email, verificationCode.trim());
    if (!result.success) {
      setVerifyingEmail(false);
      message.error(result.error?.message || "邮箱验证失败");
      return;
    }

    setLoginEmail(email);
    setVerificationCode("");

    if (verificationIntent === "login" && loginPassword) {
      const loginResult = await login(email, loginPassword);
      setVerifyingEmail(false);
      setVerificationIntent(null);

      if (loginResult.success) {
        message.success("邮箱验证成功，已为你登录。");
        navigate(returnTo, { replace: true });
        return;
      }

      setView("login");
      message.warning(
        loginResult.error?.message
          ? `邮箱验证成功，但自动登录失败：${loginResult.error.message}`
          : "邮箱验证成功，请重新登录。",
      );
      return;
    }

    setVerifyingEmail(false);
    setVerificationIntent(null);
    message.success("邮箱验证成功，请登录。");
    setView("login");
  };

  const sendVerificationCodeTo = async (email: string, successMessage = "验证码已发送，请检查邮箱。") => {
    setResendingVerification(true);
    const result = await resendVerificationCode(email);
    setResendingVerification(false);
    if (result.success) {
      setVerificationCodeSent(true);
      setVerificationCodeCooldown(result.data?.cooldownSeconds || 60);
      message.success(successMessage);
      return;
    }
    const remainingSeconds = result.data?.remainingSeconds ?? 0;
    if (remainingSeconds > 0) {
      // 撞上服务端 60s 冷却说明近期已发过码，按"已发送"处理并接上剩余倒计时
      setVerificationCodeSent(true);
      setVerificationCodeCooldown(remainingSeconds);
      message.info("验证码此前已发送，请查收邮箱（含垃圾箱）。");
      return;
    }
    setVerificationCodeSent(false);
    message.error(result.error?.message || "验证码发送失败");
  };

  const handleResendVerification = async () => {
    if (resendingVerification) return;
    if (verificationCodeCooldown > 0) { message.info(`请 ${verificationCodeCooldown} 秒后再获取验证码`); return; }
    const email = verificationEmail.trim();
    if (!email) { message.error("请输入邮箱"); return; }
    if (!emailPattern.test(email)) { message.error("请输入有效的邮箱地址"); return; }
    const correctedDomain = getEmailDomainCorrection(email);
    if (correctedDomain) { message.error(`邮箱域名是否应为 ${correctedDomain}？`); return; }
    await sendVerificationCodeTo(email);
  };

  /* ── forgotPassword ── */
  const handleSendResetCode = async () => {
    if (requestingResetCode || loading) return;
    if (resetCodeCooldown > 0) { message.info(`请 ${resetCodeCooldown} 秒后再获取验证码`); return; }
    const email = validateResetEmail();
    if (!email) return;
    setRequestingResetCode(true);
    const result = await requestPasswordReset(email);
    setRequestingResetCode(false);
    if (!result.success) {
      message.error(result.error?.message || "验证码发送失败");
      if (result.data?.remainingSeconds) setResetCodeCooldown(result.data.remainingSeconds);
      return;
    }
    setResetCodeSent(true); setResetCodeCooldown(result.data?.cooldownSeconds || 60);
    message.success("如果邮箱存在，对应验证码已发送。");
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const email = validateResetEmail();
    if (!email) return;
    if (!/^\d{6}$/.test(resetCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    if (resetPassword.length < 8) { message.error("新密码至少 8 位"); return; }
    if (resetPassword !== resetConfirmPassword) { message.error("两次输入的密码不一致"); return; }
    setSubmittingReset(true);
    const result = await resetPasswordWithCode(email, resetCode.trim(), resetPassword);
    setSubmittingReset(false);
    if (!result.success) { message.error(result.error?.message || "重置密码失败"); return; }
    message.success("密码重置成功，请使用新密码登录。");
    resetForgotFields(); setView("login");
  };

  const goView = (v: AuthView) => {
    if (v === "register") resetRegisterFields();
    if (v === "forgotPassword") resetForgotFields();
    if (v !== "verifyEmail") {
      setVerificationIntent(null);
      setVerificationCodeSent(false);
      setVerificationCodeCooldown(0);
    }
    setView(v);
  };

  const header = {
    title: view === "register" ? "创建账号" : view === "verifyEmail" ? "验证邮箱" : view === "forgotPassword" ? "重置密码" : "登录 Nubbi",
    desc: view === "register" ? "加入 Nubbi，开启结构化学习之旅" : view === "verifyEmail" ? (verificationCodeSent ? `验证码已发送至 ${verificationEmail}` : `请获取验证码以验证 ${verificationEmail}`) : view === "forgotPassword" ? "通过邮箱验证设置新密码" : "欢迎回来，继续你的知识旅程",
  };

  const handleGitHubLogin = async () => {
    const result = await loginWithGitHub(callbackURL);
    if (!result.success) message.error(result.error?.message || "GitHub 登录失败");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#fbfbfa] px-4 py-6 sm:px-5 sm:py-10">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="mb-6">
          <img className="size-12 rounded-xl border border-[#ededeb] bg-white" src={faviconSvg} alt="Nubbi" />
          <CardTitle>{header.title}</CardTitle>
          <CardDescription>{header.desc}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* ═══ verifyEmail ═══ */}
          {view === "verifyEmail" ? (
            <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4">
              <div className="flex items-start gap-2.5 rounded-[10px] bg-accent p-3.5 text-[13px] leading-relaxed text-accent-foreground">
                <span className="text-[17px] shrink-0">💡</span>
                <span>如果没有收到邮件，请检查垃圾箱，或点击下方按钮重新发送。</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verify-code">6 位验证码</Label>
                <Input
                  id="verify-code"
                  name="code"
                  className="text-center text-xl tracking-[8px] px-4"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="请输入 6 位数字"
                />
              </div>
              <Button variant="primary" className="w-full" size="lg" type="submit" disabled={verifyingEmail}>
                {verifyingEmail && <Loader2 className="animate-spin" />}
                {verifyingEmail
                  ? verificationIntent === "login" ? "验证并登录中..." : "验证中..."
                  : verificationIntent === "login" ? "验证并登录" : "验证并完成注册"}
              </Button>
              <Button variant="ghost" className="w-full" type="button" onClick={handleResendVerification} disabled={resendingVerification || verificationCodeCooldown > 0}>
                {resendingVerification
                  ? "发送中..."
                  : verificationCodeCooldown > 0
                    ? `重新发送验证码 (${verificationCodeCooldown}s)`
                    : verificationCodeSent ? "重新发送验证码" : "发送验证码"}
              </Button>
              <Button variant="link" className="w-full" type="button" onClick={() => goView("login")}>返回登录</Button>
            </form>
          ) : view === "forgotPassword" ? (
            /* ═══ forgotPassword ═══ */
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-email">账号邮箱</Label>
                <Input id="reset-email" name="email" type="email" autoComplete="email" value={resetEmail} placeholder="请输入注册邮箱"
                  className={resetEmailError ? "!border-red-500" : ""} aria-invalid={!!resetEmailError}
                  onChange={e => { setResetEmail(e.target.value); if (resetEmailError) setResetEmailError(""); }} />
                {resetEmailError ? <p className="text-xs text-red-500" role="alert">{resetEmailError}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-code">验证码</Label>
                <div className="flex gap-2.5">
                  <Input id="reset-code" name="code" className="flex-1 min-w-0" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={resetCode} placeholder="6 位数字"
                    onChange={e => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <Button className="shrink-0 w-[110px] self-center" variant="outline" size="sm" type="button"
                    onClick={handleSendResetCode}
                    disabled={loading || resetCodeCooldown > 0 || requestingResetCode}>
                    {requestingResetCode ? "发送中" : resetCodeCooldown > 0 ? `${resetCodeCooldown}s` : "获取验证码"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-password">新密码</Label>
                <PasswordInput id="reset-password" name="new-password" autoComplete="new-password" value={resetPassword} placeholder="至少 8 位" onChange={e => setResetPassword(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-confirm-password">确认新密码</Label>
                <PasswordInput id="reset-confirm-password" name="confirm-password" autoComplete="new-password" value={resetConfirmPassword} placeholder="请再次输入新密码" onChange={e => setResetConfirmPassword(e.target.value)} />
              </div>
              {resetCodeSent ? (
                <div className="rounded-[10px] bg-[#ecfdf5] p-3.5 text-[13px] leading-relaxed text-[#059669]">
                  ✅ 验证码已发送，请输入邮箱收到的 6 位数字验证码并设置新密码。
                </div>
              ) : (
                <div className="rounded-[10px] bg-accent p-3.5 text-[13px] leading-relaxed text-accent-foreground">
                  💡 先输入邮箱获取验证码，收到邮件后在此处完成密码重置。
                </div>
              )}
              <Button variant="primary" className="w-full !bg-[linear-gradient(135deg,#f59e0b,#f97316)]" size="lg" type="submit" disabled={submittingReset}>
                {submittingReset ? "重置中..." : "重置密码"}
              </Button>
              <Button variant="link" className="w-full" type="button" onClick={() => goView("login")}>返回登录</Button>
            </form>
          ) : view === "register" ? (
            /* ═══ register ═══ */
            <form onSubmit={handleRegister}>
              <div className="flex items-center gap-3.5 mb-6">
                <Separator className="flex-1" />
                <span className="text-[13px] text-text-subtle">邮箱注册</span>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-username">用户名</Label>
                  <Input id="reg-username" name="username" autoComplete="username" value={regUsername} placeholder="3-20 位字母、数字或下划线" onChange={e => setRegUsername(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-email">邮箱</Label>
                  <Input id="reg-email" name="email" type="email" autoComplete="email" value={regEmail} placeholder="请输入邮箱"
                    className={registerEmailError ? "!border-red-500" : ""} aria-invalid={!!registerEmailError}
                    onChange={e => { setRegEmail(e.target.value); if (registerEmailError) setRegisterEmailError(""); }} />
                  {registerEmailError ? <p className="text-xs text-red-500" role="alert">{registerEmailError}</p> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-code">验证码</Label>
                  <div className="flex gap-2.5">
                    <Input id="reg-code" name="code" className="flex-1 min-w-0" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={regCode} placeholder="6 位数字"
                      onChange={e => setRegCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                    <Button className="shrink-0 w-[110px] self-center" variant="outline" size="sm" type="button"
                      onClick={handleSendRegisterCode}
                      disabled={loading || registerCodeCooldown > 0 || sendingRegisterCode}>
                      {sendingRegisterCode ? "发送中" : registerCodeCooldown > 0 ? `${registerCodeCooldown}s` : "获取验证码"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-password">密码</Label>
                  <PasswordInput id="reg-password" name="new-password" autoComplete="new-password" value={regPassword} placeholder="至少 8 位" onChange={e => setRegPassword(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-confirm-password">确认密码</Label>
                  <PasswordInput id="reg-confirm-password" name="confirm-password" autoComplete="new-password" value={regConfirmPassword} placeholder="请再次输入密码" onChange={e => setRegConfirmPassword(e.target.value)} />
                </div>
                <Button variant="primary" size="lg" type="submit" disabled={loading || sendingRegisterCode}>
                  {loading && <Loader2 className="animate-spin" />}
                  注册
                </Button>
              </div>
            </form>
          ) : (
            /* ═══ login ═══ */
            <form onSubmit={handleLogin}>
              <div className="flex justify-center">
                <Button
                  aria-label="使用 GitHub 登录"
                  title="使用 GitHub 登录"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={loading}
                >
                  <Github aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-3.5 my-6">
                <Separator className="flex-1" />
                <span className="text-[13px] text-text-subtle">或使用邮箱</span>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-email">邮箱</Label>
                  <Input id="login-email" name="email" type="email" value={loginEmail} placeholder="请输入邮箱" autoComplete="email" required onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-password">密码</Label>
                  <PasswordInput id="login-password" name="password" value={loginPassword} placeholder="请输入密码" autoComplete="current-password" required onChange={e => setLoginPassword(e.target.value)} />
                </div>
                <div className="flex justify-end -mt-2">
                  <Button variant="link" type="button" onClick={() => goView("forgotPassword")}>忘记密码？</Button>
                </div>
                <Button variant="primary" size="lg" type="submit" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  登录
                </Button>
              </div>
            </form>
          )}

          {socialLoginError ? (
            <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-destructive p-3 text-[13px] leading-relaxed text-destructive-foreground">
              <span>第三方登录失败：{socialLoginError}</span>
              <button type="button" aria-label="关闭" className="ml-auto shrink-0 text-destructive-foreground text-base" onClick={() => setSocialLoginError(null)}>&times;</button>
            </div>
          ) : null}

          {view === "login" || view === "register" ? (
            <div className="flex items-center justify-center gap-1 text-sm text-text-muted">
              {view === "register" ? "已有账号？" : "还没有账号？"}
              <Button variant="link" className="p-0 h-auto font-bold" onClick={() => goView(view === "register" ? "login" : "register")}>
                {view === "register" ? "返回登录" : "立即注册"}
              </Button>
            </div>
          ) : null}
        </CardContent>

        <CardFooter />
      </Card>
    </div>
  );
};
