import { NubbiBrand } from "@/components/brand/NubbiBrand";
import type { ReactElement } from "react";

interface AuthCardHeaderProps {
  title: string;
  description: string;
}

/**
 * 让认证流程共用欢迎便签标题，复用固定角色而不重复桌面品牌组合。
 * @param props 当前认证步骤的标题与必要说明。
 * @returns 含移动端字标、步骤标题和固定便签精灵的欢迎区。
 */
export function AuthCardHeader({ title, description }: AuthCardHeaderProps): ReactElement {
  return (
    <header className="auth-card-header">
      <div className="auth-card-heading">
        <span className="auth-card-wordmark">NUBBI</span>
        <h1 className="auth-card-title">{title}</h1>
      </div>
      <p className="auth-card-description">{description}</p>
      <div aria-hidden="true" className="auth-card-mascot">
        <NubbiBrand showWordmark={false} size="lg" markClassName="auth-card-mark" />
      </div>
    </header>
  );
}
