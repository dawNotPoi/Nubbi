import nodemailer from "nodemailer";
import env from "./env";

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_SECURE ?? false,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({
      service: env.EMAIL_SERVICE || "qq",
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

export const sendVerificationEmail = async (
  to: string,
  verificationCode: string,
) => {
  const mailOptions = {
    from: env.EMAIL_FROM,
    to,
    subject: "邮箱验证码",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">邮箱验证码</h2>
        <p style="color: #666; line-height: 1.6;">
          您好，感谢注册。请在注册页面输入下面的 6 位数字验证码，完成邮箱验证。
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <div style="display: inline-block; padding: 14px 24px; border-radius: 8px; background: #f5f7ff; border: 1px solid #dbe4ff; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1d4ed8;">
            ${verificationCode}
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          验证码 24 小时内有效。如果不是您本人操作，请忽略这封邮件。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", to);
    return { success: true };
  } catch (error) {
    console.error("Verification email failed:", error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (to: string, resetCode: string) => {
  const mailOptions = {
    from: env.EMAIL_FROM,
    to,
    subject: "重置密码验证码",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">密码重置验证码</h2>
        <p style="color: #666; line-height: 1.6;">
          您发起了重置密码请求，请在当前页面输入下面的 6 位数字验证码完成密码重置。
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <div style="display: inline-block; padding: 14px 24px; border-radius: 8px; background: #f5f7ff; border: 1px solid #dbe4ff; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1d4ed8;">
            ${resetCode}
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          请回到登录页的“忘记密码”流程，输入该验证码和您的新密码。
        </p>
        <p style="color: #999; font-size: 12px; text-align: center;">
          验证码 1 小时内有效。如果不是您本人操作，请忽略这封邮件。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", to);
    return { success: true };
  } catch (error) {
    console.error("Password reset email failed:", error);
    return { success: false, error };
  }
};
