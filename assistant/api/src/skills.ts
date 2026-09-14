import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./env.js";

export type Skill = {
  name: string;
  description: string;
  directory: string;
};

const root = path.join(projectRoot, "skills");

const frontmatterValue = (source: string, key: string): string => {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(source);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
};

const parseSkill = (directory: string, source: string): Skill | null => {
  const boundary = source.indexOf("---", 3);
  if (!source.startsWith("---") || boundary < 0) return null;
  const frontmatter = source.slice(3, boundary);
  const name = frontmatterValue(frontmatter, "name");
  const description = frontmatterValue(frontmatter, "description");
  return name && description ? { name, description, directory } : null;
};

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
