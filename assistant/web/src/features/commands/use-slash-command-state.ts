import { type KeyboardEvent } from "react";
import { type CommandKey, type McpServerRef, type SkillRef } from "./slash-commands.ts";

/** SlashCommand 的视图状态及动作契约。 */
export type SlashCommandState = {
  value: string;
  changeValue: (next: string) => void;
  activeIndex: number;
  isSlash: boolean;
  command: CommandKey | null;
  commandMatches: { key: CommandKey; label: string; hint: string }[];
  modelMatches: string[];
  skillMatches: SkillRef[];
  mcpMatches: McpServerRef[];
  submit: () => Promise<void>;
  pickCommand: (key: CommandKey) => void;
  pickModel: (model: string) => void;
  dismiss: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};
