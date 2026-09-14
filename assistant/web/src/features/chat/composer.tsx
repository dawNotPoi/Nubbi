import { SendHorizontal, Square } from "lucide-react";
import { SlashPalette } from "../commands/slash-palette.tsx";
import { type McpServerRef, type SkillRef } from "../commands/slash-commands.ts";
import type { ModelStatusInfo } from "../models/model-status-panel.tsx";
import { useSlashCommand } from "../commands/use-slash-command.ts";
import { Button } from "../../components/ui/button.tsx";

/**
 * 底部输入区：支持 Enter 发送、Shift+Enter 换行，生成中切换为停止按钮。
 * 以 / 开头时先弹出命令推荐行，选择 /model 后进入模型选择子菜单，
 * /skill 与 /mcp 则展示已配置的技能与 MCP 服务（含启用状态）。
 * @param props.generating 是否正在生成，生成中禁用输入并显示停止按钮。
 * @param props.sendDisabled 模型尚未就绪时保留草稿并阻止发送。
 * @param props.onSend 发送消息回调。
 * @param props.onStop 停止生成回调。
 * @param props.models 可用模型 ID 列表，供 /model 筛选。
 * @param props.currentModel 当前模型 ID，用于高亮。
 * @param props.skills 已配置的技能列表（含启用状态）。
 * @param props.mcpServers 已配置的 MCP 服务列表（含启用状态）。
 * @param props.unlocked 是否已解锁配置管理，未解锁时禁用启停开关。
 * @param props.statusInfo /status 面板所需的状态数据。
 * @param props.onSelectModel 切换模型回调。
 * @param props.onToggleSkill 切换技能启用状态回调。
 * @param props.onToggleServer 切换 MCP 服务启用状态回调。
 * @returns 输入区视图。
 */
export const Composer = ({
  generating,
  sendDisabled,
  onSend,
  onStop,
  models,
  currentModel,
  skills,
  mcpServers,
  unlocked,
  statusInfo,
  onSelectModel,
  onToggleSkill,
  onToggleServer,
}: {
  generating: boolean;
  sendDisabled: boolean;
  onSend: (content: string) => Promise<void>;
  onStop: () => Promise<void>;
  models: string[];
  currentModel: string;
  skills: SkillRef[];
  mcpServers: McpServerRef[];
  unlocked: boolean;
  statusInfo: ModelStatusInfo;
  onSelectModel: (model: string) => Promise<void>;
  onToggleSkill: (name: string, enabled: boolean) => void;
  onToggleServer: (id: string, enabled: boolean) => void;
}): React.JSX.Element => {
  const slash = useSlashCommand({
    generating,
    sendDisabled,
    onSend,
    onSelectModel,
    onToggleSkill,
    onToggleServer,
    models,
    skills,
    mcpServers,
  });

  return (
    <footer className="shrink-0 bg-background px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2">
      <div className="relative mx-auto flex max-w-3xl flex-col">
        {slash.isSlash ? (
          <SlashPalette
            activeIndex={slash.activeIndex}
            command={slash.command}
            commandMatches={slash.commandMatches}
            currentModel={currentModel}
            mcpMatches={slash.mcpMatches}
            mcpServers={mcpServers}
            modelMatches={slash.modelMatches}
            models={models}
            onDismiss={slash.dismiss}
            onPickCommand={slash.pickCommand}
            onPickModel={slash.pickModel}
            onToggleServer={onToggleServer}
            onToggleSkill={onToggleSkill}
            skillMatches={slash.skillMatches}
            skills={skills}
            statusInfo={statusInfo}
            unlocked={unlocked}
          />
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border bg-muted/40 p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <textarea
            aria-label="输入消息"
            className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
            disabled={generating}
            onChange={(event) => slash.changeValue(event.target.value)}
            onKeyDown={slash.handleKeyDown}
            placeholder="输入消息，/ 可执行命令"
            rows={1}
            value={slash.value}
          />
          {generating ? (
            <Button aria-label="停止生成" onClick={() => void onStop()} size="icon" variant="outline">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              aria-label="发送消息"
              disabled={sendDisabled || !slash.value.trim()}
              onClick={() => void slash.submit()}
              size="icon"
            >
              <SendHorizontal />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">AI 可能出错，请核对重要信息</p>
    </footer>
  );
};
