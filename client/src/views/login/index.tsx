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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

type AuthView = "login" | "register" | "verifyEmail" | "forgotPassword";

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
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

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
    message.error(callbackError);
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
    const result = await login(loginEmail.trim(), loginPassword);
    if (!result.success) {
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(loginEmail.trim()); setVerificationCode(""); setView("verifyEmail"); return;
      }
      message.error(result.error?.message || "登录失败"); return;
    }
    message.success("登录成功"); navigate(returnTo, { replace: true });
  };

  /* ── register ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) { message.error("两次输入的密码不一致"); return; }
    const email = validateRegisterEmail();
    if (!email) { message.error(regEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱"); return; }
    if (!/^\d{6}$/.test(regCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    const result = await register(email, regPassword, regUsername.trim(), regCode.trim());
    if (!result.success) { message.error(result.error?.message || "注册失败"); return; }
    resetRegisterFields();
    message.success("注册成功，请登录。"); setView("login");
  };

  const handleSendRegisterCode = async () => {
    if (sendingRegisterCode || loading) return;
    if (registerCodeCooldown > 0) { message.info(`请 ${registerCodeCooldown} 秒后再获取验证码`); return; }
    const email = validateRegisterEmail();
    if (!email) { message.error(regEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱"); return; }
    setSendingRegisterCode(true);
    const result = await sendRegisterCode(email);
    setSendingRegisterCode(false);
    if (!result.success) {
      if (result.data?.emailRegistered && result.data.emailVerified === false) {
        setVerificationEmail(email); setVerificationCode(""); setView("verifyEmail");
        setResendingVerification(true);
        const r = await resendVerificationCode(email);
        setResendingVerification(false);
        if (!r.success) { message.error(r.error?.message || "验证码重新发送失败"); return; }
        message.success("邮箱已注册但尚未验证，验证码已重新发送。"); return;
      }
      message.error(result.error?.message || "验证码发送失败");
      if (result.data?.remainingSeconds) setRegisterCodeCooldown(result.data.remainingSeconds);
      return;
    }
    setRegisterCodeCooldown(result.data?.cooldownSeconds || 60);
    message.success("验证码已发送，请检查邮箱。");
  };

  /* ── verifyEmail ── */
  const handleVerifyEmail = async () => {
    if (!/^\d{6}$/.test(verificationCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    setVerifyingEmail(true);
    const result = await verifyEmailWithCode(verificationEmail.trim(), verificationCode.trim());
    setVerifyingEmail(false);
    if (!result.success) { message.error(result.error?.message || "邮箱验证失败"); return; }
    message.success("邮箱验证成功，请登录。"); setView("login"); setVerificationCode("");
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    const result = await resendVerificationCode(verificationEmail.trim());
    setResendingVerification(false);
    if (!result.success) { message.error(result.error?.message || "验证码发送失败"); return; }
    message.success("验证码已重新发送，请检查邮箱。");
  };

  /* ── forgotPassword ── */
  const handleSendResetCode = async () => {
    if (requestingResetCode || loading) return;
    if (resetCodeCooldown > 0) { message.info(`请 ${resetCodeCooldown} 秒后再获取验证码`); return; }
    const email = validateResetEmail();
    if (!email) { message.error(resetEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱"); return; }
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

  const handleResetPassword = async () => {
    const email = validateResetEmail();
    if (!email) { message.error(resetEmail.trim() ? "请输入有效的邮箱地址" : "请输入邮箱"); return; }
    if (!/^\d{6}$/.test(resetCode.trim())) { message.error("请输入 6 位数字验证码"); return; }
    if (resetPassword.length < 6) { message.error("新密码至少 6 位"); return; }
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
    setView(v);
  };

  const header = {
    title: view === "register" ? "创建账号" : view === "verifyEmail" ? "验证邮箱" : view === "forgotPassword" ? "重置密码" : "登录 Nubbi",
    desc: view === "register" ? "加入 Nubbi，开启结构化学习之旅" : view === "verifyEmail" ? `验证码已发送至 ${verificationEmail}` : view === "forgotPassword" ? "通过邮箱验证设置新密码" : "欢迎回来，继续你的知识旅程",
  };

  const handleGitHubLogin = async () => {
    const result = await loginWithGitHub(callbackURL);
    if (!result.success) message.error(result.error?.message || "GitHub 登录失败");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfa] px-5 py-10">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="mb-6">
          <img className="size-12 rounded-xl border border-[#ededeb] bg-white" src={faviconSvg} alt="Nubbi" />
          <CardTitle>{header.title}</CardTitle>
          <CardDescription>{header.desc}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* ═══ verifyEmail ═══ */}
          {view === "verifyEmail" ? (
            <>
              <div className="flex items-start gap-2.5 rounded-[10px] bg-accent p-3.5 text-[13px] leading-relaxed text-accent-foreground">
                <span className="text-[17px] shrink-0">💡</span>
                <span>如果没有收到邮件，请检查垃圾箱，或点击下方按钮重新发送。</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>6 位验证码</Label>
                <Input
                  className="text-center text-xl tracking-[8px] px-4"
                  maxLength={6}
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="请输入 6 位数字"
                />
              </div>
              <Button variant="primary" className="w-full" size="lg" onClick={handleVerifyEmail} disabled={verifyingEmail}>
                {verifyingEmail && <Loader2 className="animate-spin" />}
                {verifyingEmail ? "验证中..." : "验证并完成注册"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleResendVerification} disabled={resendingVerification}>
                {resendingVerification ? "发送中..." : "重新发送验证码"}
              </Button>
              <Button variant="link" className="w-full" onClick={() => goView("login")}>返回登录</Button>
            </>
          ) : view === "forgotPassword" ? (
            /* ═══ forgotPassword ═══ */
            <>
              <div className="flex flex-col gap-1.5">
                <Label>账号邮箱</Label>
                <Input type="email" value={resetEmail} placeholder="请输入注册邮箱" className={resetEmailError ? "!border-red-500" : ""}
                  onChange={e => { setResetEmail(e.target.value); if (resetEmailError) setResetEmailError(""); }} />
                {resetEmailError ? <p className="text-xs text-red-500">{resetEmailError}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>验证码</Label>
                <div className="flex gap-2.5">
                  <Input className="flex-1 min-w-0" maxLength={6} inputMode="numeric" value={resetCode} placeholder="6 位数字"
                    onChange={e => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <Button className="shrink-0 w-[110px] self-center" variant="outline" size="sm"
                    onClick={handleSendResetCode}
                    disabled={loading || resetCodeCooldown > 0 || requestingResetCode}>
                    {requestingResetCode ? "发送中" : resetCodeCooldown > 0 ? `${resetCodeCooldown}s` : "获取验证码"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>新密码</Label>
                <Input type="password" value={resetPassword} placeholder="至少 6 位" onChange={e => setResetPassword(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>确认新密码</Label>
                <Input type="password" value={resetConfirmPassword} placeholder="请再次输入新密码" onChange={e => setResetConfirmPassword(e.target.value)} />
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
              <Button variant="primary" className="w-full !bg-[linear-gradient(135deg,#f59e0b,#f97316)]" size="lg" onClick={handleResetPassword} disabled={submittingReset}>
                {submittingReset ? "重置中..." : "重置密码"}
              </Button>
              <Button variant="link" className="w-full" onClick={() => goView("login")}>返回登录</Button>
            </>
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
                  <Label>用户名</Label>
                  <Input value={regUsername} placeholder="3-20 位字母、数字或下划线" onChange={e => setRegUsername(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>邮箱</Label>
                  <Input value={regEmail} placeholder="请输入邮箱" className={registerEmailError ? "!border-red-500" : ""}
                    onChange={e => { setRegEmail(e.target.value); if (registerEmailError) setRegisterEmailError(""); }} />
                  {registerEmailError ? <p className="text-xs text-red-500">{registerEmailError}</p> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>验证码</Label>
                  <div className="flex gap-2.5">
                    <Input className="flex-1 min-w-0" maxLength={6} inputMode="numeric" value={regCode} placeholder="6 位数字"
                      onChange={e => setRegCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                    <Button className="shrink-0 w-[110px] self-center" variant="outline" size="sm"
                      onClick={handleSendRegisterCode}
                      disabled={loading || registerCodeCooldown > 0 || sendingRegisterCode}>
                      {sendingRegisterCode ? "发送中" : registerCodeCooldown > 0 ? `${registerCodeCooldown}s` : "获取验证码"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>密码</Label>
                  <Input type="password" value={regPassword} placeholder="至少 6 位" onChange={e => setRegPassword(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>确认密码</Label>
                  <Input type="password" value={regConfirmPassword} placeholder="请再次输入密码" onChange={e => setRegConfirmPassword(e.target.value)} />
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
              <Button variant="outline" className="w-full" type="button" onClick={handleGitHubLogin} disabled={loading}>
                <Github size={20} /> 使用 GitHub 登录
              </Button>
              <div className="flex items-center gap-3.5 my-6">
                <Separator className="flex-1" />
                <span className="text-[13px] text-text-subtle">或使用邮箱</span>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>邮箱</Label>
                  <Input type="email" value={loginEmail} placeholder="请输入邮箱" onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>密码</Label>
                  <Input type="password" value={loginPassword} placeholder="请输入密码" onChange={e => setLoginPassword(e.target.value)} />
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
            <div className="flex items-start gap-2.5 rounded-[10px] bg-destructive p-3 text-[13px] leading-relaxed text-destructive-foreground">
              <span>第三方登录失败：{socialLoginError}</span>
              <button className="ml-auto shrink-0 text-destructive-foreground text-base" onClick={() => setSocialLoginError(null)}>&times;</button>
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
