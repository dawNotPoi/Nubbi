import { Activity, Boxes, Puzzle, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { ExtensionList } from "./extension-list";
import { ModelStatusPanel, type ModelStatusInfo } from "./model-status-panel";

/** 已配置的技能引用（含启用状态）。 */
export type SkillRef = { name: string; description: string; enabled: boolean };
/** 已配置的 MCP 服务（含启用状态与工具数）。 */
export type McpServerRef = {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  toolCount: number;
};
/** 顶层 / 命令标识。 */
export type CommandKey = "model" | "skill" | "mcp" | "status";

/** 顶层命令推荐列表：label 是输入提示，hint 是用途说明。 */
export const COMMANDS: Array<{ key: CommandKey; label: string; hint: string }> = [
  { key: "model", label: "/model", hint: "切换模型" },
  { key: "status", label: "/status", hint: "查看模型状态" },
  { key: "skill", label: "/skill", hint: "查看已配置的技能" },
  { key: "mcp", label: "/mcp", hint: "查看已配置的 MCP 服务" },
];

/** 顶层命令对应的图标。 */
const CommandIcon = ({ command }: { command: CommandKey }) => {
  if (command === "model") return <Sparkles className="size-4 shrink-0 text-primary" />;
  if (command === "status") return <Activity className="size-4 shrink-0 text-primary" />;
  if (command === "skill") return <Puzzle className="size-4 shrink-0 text-primary" />;
  return <Boxes className="size-4 shrink-0 text-primary" />;
};

/**
 * 输入框上方的斜杠命令面板：顶层推荐命令，选中后进入对应子菜单。
 * /skill 与 /mcp 展示全部已配置项并提供行内启停开关，/status 展示模型状态面板。
 * @param props.command 当前子菜单；null 表示顶层命令推荐。
 * @param props.activeIndex 当前高亮项的索引。
 * @param props.currentModel 当前模型 ID，用于模型列表高亮。
 * @param props.statusInfo /status 面板所需的状态数据。
 * @param props.commandMatches 顶层命令匹配结果。
 * @param props.modelMatches 模型子菜单匹配结果。
 * @param props.skillMatches 技能子菜单匹配结果。
 * @param props.mcpMatches MCP 服务子菜单匹配结果。
 * @param props.models 全部模型列表，用于空态文案。
 * @param props.skills 全部技能列表，用于空态文案。
 * @param props.mcpServers 全部 MCP 服务列表，用于空态文案。
 * @param props.unlocked 是否已解锁配置管理，未解锁时禁用启停开关。
 * @param props.onPickCommand 选中顶层命令回调。
 * @param props.onPickModel 选中模型回调。
 * @param props.onToggleSkill 切换技能启用状态回调。
 * @param props.onToggleServer 切换 MCP 服务启用状态回调。
 * @param props.onDismiss 退出命令模式回调。
 * @returns 命令面板视图。
 */
export const SlashPalette = ({
  command,
  activeIndex,
  currentModel,
  statusInfo,
  commandMatches,
  modelMatches,
  skillMatches,
  mcpMatches,
  models,
  skills,
  mcpServers,
  unlocked,
  onPickCommand,
  onPickModel,
  onToggleSkill,
  onToggleServer,
  onDismiss,
}: {
  command: CommandKey | null;
  activeIndex: number;
  currentModel: string;
  statusInfo: ModelStatusInfo;
  commandMatches: typeof COMMANDS;
  modelMatches: string[];
  skillMatches: SkillRef[];
  mcpMatches: McpServerRef[];
  models: string[];
  skills: SkillRef[];
  mcpServers: McpServerRef[];
  unlocked: boolean;
  onPickCommand: (key: CommandKey) => void;
  onPickModel: (model: string) => void;
  onToggleSkill: (name: string, enabled: boolean) => void;
  onToggleServer: (id: string, enabled: boolean) => void;
  onDismiss: () => void;
}) => {
  const title = command === "model"
    ? "切换模型（/model）"
    : command === "skill"
      ? "已配置的技能（/skill）"
      : command === "mcp"
        ? "已配置的 MCP 服务（/mcp）"
        : command === "status"
          ? "模型状态（/status）"
          : "命令";

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-80 overflow-y-auto rounded-2xl border bg-background py-1 shadow-lg">
      <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{title}</p>
      {command === null ? (
        commandMatches.length ? (
          commandMatches.map((item, index) => (
            <button
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted",
                index === activeIndex && "bg-muted ring-1 ring-inset ring-primary/30",
              )}
              key={item.key}
              onClick={() => onPickCommand(item.key)}
              type="button"
            >
              <CommandIcon command={item.key} />
              <span className="font-medium">{item.label}</span>
              <span className="truncate text-xs text-muted-foreground">{item.hint}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">没有匹配的命令</p>
        )
      ) : command === "status" ? (
        <ModelStatusPanel info={statusInfo} />
      ) : command === "model" ? (
        modelMatches.length ? (
          modelMatches.map((model, index) => (
            <button
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                index === activeIndex && "bg-muted ring-1 ring-inset ring-primary/30",
              )}
              key={model}
              onClick={() => onPickModel(model)}
              type="button"
            >
              <span className={cn("size-2 shrink-0 rounded-full", model === currentModel ? "bg-primary" : "bg-border")} />
              <span className="truncate">{model}</span>
              {model === currentModel ? <span className="ml-auto text-xs text-muted-foreground">当前</span> : null}
            </button>
          ))
        ) : (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {models.length ? "没有匹配的模型" : "未获取到模型列表，请先在设置中配置"}
          </p>
        )
      ) : command === "skill" ? (
        skillMatches.length ? (
          <ExtensionList
            activeIndex={activeIndex}
            icon={<Puzzle className="size-4 shrink-0 text-primary" />}
            items={skillMatches.map((item) => ({
              key: item.name,
              name: item.name,
              secondary: item.description,
              enabled: item.enabled,
            }))}
            onDismiss={onDismiss}
            onToggle={onToggleSkill}
            unlocked={unlocked}
          />
        ) : (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {skills.length ? "没有匹配的技能" : "尚未配置技能"}
          </p>
        )
      ) : (
        mcpMatches.length ? (
          <ExtensionList
            activeIndex={activeIndex}
            icon={<Boxes className="size-4 shrink-0 text-primary" />}
            items={mcpMatches.map((item) => ({
              key: item.id,
              name: item.name,
              secondary: item.toolCount ? `${item.toolCount} 个工具` : item.endpoint,
              enabled: item.enabled,
              badge: { text: item.enabled ? "可用" : "不可用", positive: item.enabled },
            }))}
            onDismiss={onDismiss}
            onToggle={onToggleServer}
            unlocked={unlocked}
          />
        ) : (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {mcpServers.length ? "没有匹配的服务" : "尚未配置 MCP 服务"}
          </p>
        )
      )}
    </div>
  );
};
