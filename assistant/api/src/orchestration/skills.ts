import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "../config/env.js";

export type Skill = {
  name: string;
  description: string;
  directory: string;
};

/** 带启用状态的技能视图，供能力清单展示。 */
export type SkillState = Skill & { enabled: boolean };

const root = path.join(projectRoot, "skills");
const stateFile = path.join(projectRoot, "config", "skills.json");

/**
 * 从 SKILL.md 的 YAML frontmatter 中读取指定字段，并去掉引号与首尾空白。
 * @param source SKILL.md 文件内容。
 * @param key 要读取的 frontmatter 字段名。
 * @returns 字段值；不存在时返回空字符串。
 */
const frontmatterValue = (source: string, key: string): string => {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(source);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
};

/**
 * 解析单个 Skill 目录：只有同时提供 name 和 description 的才视为有效。
 * @param directory Skill 所在目录路径。
 * @param source SKILL.md 文件内容。
 * @returns 解析成功的 Skill 元信息，无效时返回 null。
 */
const parseSkill = (directory: string, source: string): Skill | null => {
  const boundary = source.indexOf("---", 3);
  if (!source.startsWith("---") || boundary < 0) return null;
  const frontmatter = source.slice(3, boundary);
  const name = frontmatterValue(frontmatter, "name");
  const description = frontmatterValue(frontmatter, "description");
  return name && description ? { name, description, directory } : null;
};

/**
 * 扫描 skills 目录，读取每个子目录的 SKILL.md 并返回全部有效 Skill。
 * @returns 全部有效 Skill 的元信息列表。
 */
const scanSkills = async (): Promise<Skill[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const directory = path.join(root, entry.name);
        const source = await readFile(path.join(directory, "SKILL.md"), "utf8")
          .catch(() => "");
        return parseSkill(directory, source);
      }),
  );
  return skills.filter((skill): skill is Skill => skill !== null);
};

/**
 * 读取技能启停状态配置；未记录的技能默认视为启用。
 * @returns 技能名到启用状态的映射。
 */
const readSkillStates = async (): Promise<Record<string, boolean>> => {
  const source = await readFile(stateFile, "utf8").catch(() => "");
  if (!source) return {};
  try {
    const parsed = JSON.parse(source) as { skills?: Record<string, boolean> };
    return parsed.skills ?? {};
  } catch {
    return {};
  }
};

/**
 * 写入技能启停状态配置。
 * @param states 技能名到启用状态的映射。
 * @returns 无返回值。
 */
const writeSkillStates = async (states: Record<string, boolean>): Promise<void> => {
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify({ skills: states }, null, 2)}\n`, "utf8");
};

/**
 * 返回全部有效技能及其启用状态，供能力清单与管理界面展示。
 * @returns 技能元信息与启用状态列表。
 */
export const listAllSkills = async (): Promise<SkillState[]> => {
  const [skills, states] = await Promise.all([scanSkills(), readSkillStates()]);
  return skills.map((skill) => ({
    ...skill,
    enabled: states[skill.name] !== false,
  }));
};

/**
 * 返回当前启用的技能列表，供 Agent 编排使用。
 * @returns 启用状态的技能元信息列表。
 */
export const listSkills = async (): Promise<Skill[]> => {
  const all = await listAllSkills();
  return all
    .filter((item) => item.enabled)
    .map(({ name, description, directory }) => ({ name, description, directory }));
};

/**
 * 更新单个技能的启用状态并持久化。
 * @param name 技能名称。
 * @param enabled 是否启用。
 * @returns 更新后的技能信息；技能不存在时返回 null。
 */
export const setSkillEnabled = async (
  name: string,
  enabled: boolean,
): Promise<SkillState | null> => {
  const skills = await scanSkills();
  const skill = skills.find((item) => item.name === name);
  if (!skill) return null;
  const states = await readSkillStates();
  states[name] = enabled;
  await writeSkillStates(states);
  return { ...skill, enabled };
};

/**
 * 加载 Skill 的完整指令正文（frontmatter 之后的 Markdown），供激活后注入给模型。
 * 仅对已启用的 Skill 生效，禁用的 Skill 无法被激活。
 * @param name Skill 名称。
 * @returns Skill 元信息与指令正文；Skill 不存在或已禁用时返回 null。
 */
export const loadSkill = async (name: string) => {
  const skill = (await listSkills()).find((item) => item.name === name);
  if (!skill) return null;
  const source = await readFile(path.join(skill.directory, "SKILL.md"), "utf8");
  const boundary = source.indexOf("---", 3);
  return {
    ...skill,
    instructions: boundary >= 0 ? source.slice(boundary + 3).trim() : source,
  };
};
