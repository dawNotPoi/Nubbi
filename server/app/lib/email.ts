import nodemailer from "nodemailer";
import env from "./env";

// 创建邮件传输对象
const transporter = nodemailer.createTransport({
  service: "qq", // 使用 QQ 邮箱服务
  auth: {
    user: env.EMAIL_USER, // 你的邮箱地址
    pass: env.EMAIL_PASS, // 邮箱授权码（不是登录密码）
  },
});

// 发送验证邮件
export const sendVerificationEmail = async (to: string, token: string) => {
  const verificationUrl = `${env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_USER,
    to: to,
    subject: "验证您的邮箱地址",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">邮箱验证</h2>
        <p style="color: #666; line-height: 1.6;">
          您好！感谢您注册我们的服务。请点击下面的按钮验证您的邮箱地址：
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            验证邮箱
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          如果按钮无法点击，请复制以下链接到浏览器：<br>
          <a href="${verificationUrl}" style="color: #1890ff;">${verificationUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; text-align: center;">
          此链接将在24小时后失效。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("验证邮件发送成功:", to);
    return { success: true };
  } catch (error) {
    console.error("验证邮件发送失败:", error);
    return { success: false, error };
  }
};

// 发送密码重置邮件
export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `${env.BETTER_AUTH_URL}/api/auth/reset-password?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_USER,
    to: to,
    subject: "重置您的密码",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">密码重置</h2>
        <p style="color: #666; line-height: 1.6;">
          您请求重置密码。请点击下面的按钮重置您的密码：
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            重置密码
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          如果按钮无法点击，请复制以下链接到浏览器：<br>
          <a href="${resetUrl}" style="color: #1890ff;">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; text-align: center;">
          此链接将在1小时后失效。如果您没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("密码重置邮件发送成功:", to);
    return { success: true };
  } catch (error) {
    console.error("密码重置邮件发送失败:", error);
    return { success: false, error };
  }
};
