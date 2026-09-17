import { Component, type ErrorInfo, type ReactNode } from "react";

type MobileErrorBoundaryProps = {
  children: ReactNode;
  scope: string;
};

type MobileErrorBoundaryState = {
  error: Error | null;
};

/**
 * 移动端运行时错误兜底，避免 React 子树异常后只留下空白页。
 * @param props 子树与诊断范围名称。
 * @returns 可恢复的错误界面或正常子树。
 */
export default class MobileErrorBoundary extends Component<
  MobileErrorBoundaryProps,
  MobileErrorBoundaryState
> {
  state: MobileErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[mobile-runtime:${this.props.scope}]`, error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-5 py-8 text-text-primary">
        <div className="w-full max-w-md rounded-[12px] border border-border-row bg-surface p-5 shadow-soft">
          <p className="text-[12px] font-medium uppercase tracking-wide text-text-subtle">
            Mobile Runtime · {this.props.scope}
          </p>
          <h1 className="mt-2 text-[20px] font-semibold leading-7">页面加载失败</h1>
          <p className="mt-2 text-[14px] leading-6 text-text-muted">
            已捕获移动端运行时异常。下面的信息用于定位问题，不会影响桌面端。
          </p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-[8px] bg-bg-hover p-3 text-[12px] leading-5 text-[var(--danger-text)]">
            {error.name}: {error.message}
          </pre>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-[8px] border border-border-button bg-surface px-3 text-[14px] font-medium active:bg-bg-selected"
              onClick={() => window.location.reload()}
              type="button"
            >
              重新加载
            </button>
            <button
              className="min-h-11 rounded-[8px] bg-[var(--accent-border)] px-3 text-[14px] font-medium text-white active:bg-[var(--accent-active)]"
              onClick={() => {
                window.location.href = "/home";
              }}
              type="button"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }
}
