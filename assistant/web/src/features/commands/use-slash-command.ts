import type { SlashCommandState } from "./use-slash-command-state.ts";
import { useMemo, useState, type KeyboardEvent } from "react";
import { COMMANDS, type CommandKey, type McpServerRef, type SkillRef } from "./slash-commands.ts";

/** useSlashCommand 的输入参数。 */
export type UseSlashCommandInput = {
  generating: boolean;
  onSend: (content: string) => Promise<void>;
  onSelectModel: (model: string) => Promise<void>;
  onToggleSkill: (name: string, enabled: boolean) => void;
  onToggleServer: (id: string, enabled: boolean) => void;
  models: string[];
  skills: SkillRef[];
  mcpServers: McpServerRef[];
};

/**
 * 斜杠命令状态机：管理 / 命令的输入、层级切换与键盘交互。
 * @param input 依赖的发送/切换回调与可用数据列表。
 * @returns 命令模式所需的状态、匹配结果与操作函数。
 */
export const useSlashCommand = (input: UseSlashCommandInput): SlashCommandState => {
  const { generating, onSend, onSelectModel, onToggleSkill, onToggleServer, models, skills, mcpServers } = input;
  const [value, setValue] = useState("");
  // 当前所处的命令子菜单；null 表示顶层命令推荐。
  const [command, setCommand] = useState<CommandKey | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isSlash = value.startsWith("/");
  const query = isSlash ? value.slice(1).trim().toLowerCase() : "";

  // 按当前层级计算匹配项：顶层匹配命令，子菜单匹配各自数据。
  const commandMatches = useMemo(
    () =>
      isSlash && command === null
        ? COMMANDS.filter(
            (item) => item.label.slice(1).toLowerCase().includes(query) || item.hint.toLowerCase().includes(query),
          )
        : [],
    [command, isSlash, query],
  );
  const modelMatches = useMemo(
    () => (isSlash && command === "model" ? models.filter((model) => model.toLowerCase().includes(query)) : []),
    [command, isSlash, models, query],
  );
  const skillMatches = useMemo(
    () =>
      isSlash && command === "skill"
        ? skills.filter(
            (item) => item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
          )
        : [],
    [command, isSlash, query, skills],
  );
  const mcpMatches = useMemo(
    () =>
      isSlash && command === "mcp"
        ? mcpServers.filter(
            (item) => item.name.toLowerCase().includes(query) || item.endpoint.toLowerCase().includes(query),
          )
        : [],
    [command, isSlash, mcpServers, query],
  );

  const changeValue = (next: string): void => {
    setValue(next);
    setActiveIndex(0);
    // 删除 / 后关闭弹出层并重置子菜单，避免残留状态。
    if (!next.startsWith("/")) setCommand(null);
  };

  /**
   * 发送当前输入框内容并清空草稿。
   * @returns 发送完成后的 Promise。
   */
  const submit = async (): Promise<void> => {
    const content = value.trim();
    if (!content || generating) return;
    setValue("");
    await onSend(content);
  };

  /**
   * 选中顶层命令：进入对应子菜单并重置输入为 /。
   * @param key 命令标识。
   * @returns 无返回值。
   */
  const pickCommand = (key: CommandKey): void => {
    setCommand(key);
    setValue("/");
    setActiveIndex(0);
  };

  /**
   * 选中模型并切换，随后退出命令模式。
   * @param model 目标模型 ID。
   * @returns 无返回值。
   */
  const pickModel = (model: string): void => {
    setValue("");
    setCommand(null);
    setActiveIndex(0);
    void onSelectModel(model);
  };

  /**
   * 退出命令模式并清空输入。
   * @returns 无返回值。
   */
  const dismiss = (): void => {
    setValue("");
    setCommand(null);
    setActiveIndex(0);
  };

  /**
   * 键盘事件处理：命令模式下方向键选择、回车确认/切换、Esc 退出；
   * 普通模式未组合输入时回车发送，Shift+回车换行。
   * @param event 文本域键盘事件。
   * @returns 无返回值。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.nativeEvent.isComposing) return;
    if (!isSlash) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void submit();
      }
      return;
    }
    const total =
      command === null
        ? commandMatches.length
        : command === "model"
          ? modelMatches.length
          : command === "skill"
            ? skillMatches.length
            : command === "mcp"
              ? mcpMatches.length
              : 0;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (total) setActiveIndex((index) => (index + 1) % total);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (total) setActiveIndex((index) => (index - 1 + total) % total);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (command === null) {
        const target = commandMatches[activeIndex];
        if (target) pickCommand(target.key);
      } else if (command === "model") {
        const target = modelMatches[activeIndex];
        if (target) pickModel(target);
      } else if (command === "skill") {
        // 回车切换当前高亮技能的启用状态，保持弹层打开以便连续操作。
        const target = skillMatches[activeIndex];
        if (target) onToggleSkill(target.name, !target.enabled);
      } else if (command === "mcp") {
        const target = mcpMatches[activeIndex];
        if (target) onToggleServer(target.id, !target.enabled);
      } else {
        // /status 是查看型命令，回车退出命令模式。
        dismiss();
      }
    }
  };

  return {
    value,
    changeValue,
    activeIndex,
    isSlash,
    command,
    commandMatches,
    modelMatches,
    skillMatches,
    mcpMatches,
    submit,
    pickCommand,
    pickModel,
    dismiss,
    handleKeyDown,
  };
};
