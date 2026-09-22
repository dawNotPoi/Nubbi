import { resetPasswordWithCode } from "@/utils/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useState, type FormEvent, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthCardHeader } from "../login/AuthCardHeader";
import { getAuthErrorText } from "../login/auth-error";

/**
 * 处理带邮箱验证码的独立密码重置流程。
 * @returns 与 Nubbi 视觉体系一致的密码重置页面。
 */
export const ResetPasswordPage = (): ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState(params.get("code") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  /**
   * 在请求前保留原有邮箱、验证码和两次密码校验。
   * @param event 表单提交事件。
   * @returns 提交及结果提示完成的 Promise。
   */
  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("请输入有效的邮箱地址"); return; }
    if (!/^\d{6}$/.test(code.trim())) { toast.error("请输入 6 位数字验证码"); return; }
    if (password.length < 8) { toast.error("密码至少 8 位"); return; }
    if (password !== confirmPassword) { toast.error("两次输入的密码不一致"); return; }
    setSubmitting(true);
    try {
      const result = await resetPasswordWithCode(email.trim(), code.trim(), password);
      if (!result.success) { toast.error(getAuthErrorText(result.error, "重置密码失败，请稍后重试")); return; }
      setResetDone(true);
      toast.success("密码重置成功，请使用新密码登录。");
    } finally { setSubmitting(false); }
  };

  return <div className="auth-form">
    <AuthCardHeader title={resetDone ? "密码已更新" : "设置新的密码"} description={resetDone ? "现在可以使用新密码登录，继续收好你的灵感。" : "请输入注册邮箱、邮件里的 6 位数字验证码，以及你的新密码。"} />
    {resetDone ? <div className="space-y-4">
      <Alert tone="success" title="密码已更新">现在可以返回登录页，使用新密码重新登录。</Alert>
      <Button className="h-11 w-full" variant="primary" onClick={() => navigate("/login")}>返回登录</Button>
    </div> : <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5"><Label htmlFor="recovery-email">邮箱</Label><Input id="recovery-email" className="h-11 pl-3" type="email" autoComplete="email" required placeholder="请输入注册邮箱" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="recovery-code">6 位验证码</Label><Input id="recovery-code" className="h-11 pl-3 text-center tracking-[0.22em]" maxLength={6} inputMode="numeric" autoComplete="one-time-code" required placeholder="请输入 6 位数字验证码" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
      <div className="space-y-1.5"><Label htmlFor="recovery-password">新密码</Label><PasswordInput id="recovery-password" className="h-11" autoComplete="new-password" required minLength={8} placeholder="请输入新密码" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="recovery-confirm-password">确认新密码</Label><PasswordInput id="recovery-confirm-password" className="h-11" autoComplete="new-password" required minLength={8} placeholder="请再次输入新密码" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
      <Button className="h-11 w-full" variant="primary" type="submit" loading={submitting}>确认重置</Button>
    </form>}
  </div>;
};
