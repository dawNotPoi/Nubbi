import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils.ts";

/** 行内启停开关：小号滑动按钮。 */
export const ToggleSwitch = ({
  enabled,
  disabled = false,
  label,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}): React.JSX.Element => (
  <button
    aria-label={`${enabled ? "停用" : "启用"}${label}`}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
      enabled ? "bg-primary" : "bg-muted",
      disabled && "pointer-events-none opacity-50",
    )}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onChange();
    }}
    type="button"
  >
    <span
      className={cn("ml-0.5 size-4 rounded-full bg-background shadow transition-transform", enabled && "translate-x-4")}
    />
  </button>
);

/** 扩展列表单行的展示数据。 */
export type ExtensionItem = {
  key: string;
  name: string;
  /** 名称下方的次要说明文本。 */
  secondary: string;
  enabled: boolean;
  /** 可选的状态徽标，positive 控制配色（可用/正常）。 */
  badge?: { text: string; positive: boolean };
};

/**
 * 技能 / MCP 服务列表：每行含图标、名称与说明，右侧为启停开关。
 * 未解锁配置时以锁图标代替开关，避免无权限操作。
 * @param props.items 展示数据列表。
 * @param props.icon 行首图标。
 * @param props.activeIndex 键盘高亮项的索引。
 * @param props.unlocked 是否已解锁配置管理。
 * @param props.onToggle 切换启用状态回调（key, enabled）。
 * @param props.onDismiss 点击行主体退出命令模式回调。
 * @returns 列表视图。
 */
export const ExtensionList = ({
  items,
  icon,
  activeIndex = -1,
  unlocked,
  onToggle,
  onDismiss,
}: {
  items: ExtensionItem[];
  icon: ReactNode;
  activeIndex?: number;
  unlocked: boolean;
  onToggle: (key: string, enabled: boolean) => void;
  onDismiss: () => void;
}): React.JSX.Element => (
  <>
    {items.map((item, index) => (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 hover:bg-muted",
          index === activeIndex && "bg-muted ring-1 ring-inset ring-primary/30",
        )}
        key={item.key}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left text-sm"
          onClick={onDismiss}
          type="button"
        >
          {icon}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{item.name}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[10px] font-medium",
                    item.badge.positive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {item.badge.text}
                </span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{item.secondary}</span>
          </span>
        </button>
        {unlocked ? (
          <ToggleSwitch enabled={item.enabled} label={item.name} onChange={() => onToggle(item.key, !item.enabled)} />
        ) : (
          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
    ))}
  </>
);
