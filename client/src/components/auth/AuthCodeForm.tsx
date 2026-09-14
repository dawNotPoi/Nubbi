import { Button, Input } from "antd";
import { ReactNode } from "react";

type AuthCodeFormProps = {
  title: string;
  description: string;
  email: string;
  code: string;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  submitText: string;
  submitting?: boolean;
  emailReadOnly?: boolean;
  codePlaceholder?: string;
  extraFields?: ReactNode;
  hint?: ReactNode;
  onResend?: () => void;
  resendText?: string;
  resendLoading?: boolean;
  onBack?: () => void;
  backText?: string;
};

export const AuthCodeForm = ({
  title,
  description,
  email,
  code,
  onEmailChange,
  onCodeChange,
  onSubmit,
  submitText,
  submitting = false,
  emailReadOnly = false,
  codePlaceholder = "请输入 6 位数字验证码",
  extraFields,
  hint,
  onResend,
  resendText = "重新发送验证码",
  resendLoading = false,
  onBack,
  backText = "返回",
}: AuthCodeFormProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">邮箱</div>
          <Input
            size="large"
            value={email}
            readOnly={emailReadOnly}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-gray-700">验证码</div>
          <Input
            size="large"
            value={code}
            maxLength={6}
            inputMode="numeric"
            onChange={(event) =>
              onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder={codePlaceholder}
          />
        </div>

        {extraFields}

        {hint ? <div>{hint}</div> : null}

        <Button
          type="primary"
          size="large"
          block
          loading={submitting}
          onClick={onSubmit}
        >
          {submitText}
        </Button>

        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <Button onClick={onBack} disabled={submitting || resendLoading}>
              {backText}
            </Button>
          ) : (
            <span />
          )}

          {onResend ? (
            <Button
              type="link"
              className="px-0"
              loading={resendLoading}
              onClick={onResend}
            >
              {resendText}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
