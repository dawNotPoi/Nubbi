import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./env.js";

export type Skill = {
  name: string;
  description: string;
  directory: string;
};

const root = path.join(projectRoot, "skills");

/** 从 SKILL.md 的 YAML frontmatter 中读取指定字段，并去掉引号与首尾空白。 */
const frontmatterValue = (source: string, key: string): string => {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(source);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
};

/** 解析单个 Skill 目录：只有同时提供 name 和 description 的才视为有效。 */
const parseSkill = (directory: string, source: string): Skill | null => {
  const boundary = source.indexOf("---", 3);
  if (!source.startsWith("---") || boundary < 0) return null;
  const frontmatter = source.slice(3, boundary);
  const name = frontmatterValue(frontmatter, "name");
  const description = frontmatterValue(frontmatter, "description");
  return name && description ? { name, description, directory } : null;
};

/** 扫描 skills 目录，读取每个子目录的 SKILL.md 并返回有效 Skill 列表。 */
export const listSkills = async (): Promise<Skill[]> => {
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

/** 加载 Skill 的完整指令正文（frontmatter 之后的 Markdown），供激活后注入给模型。 */
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
