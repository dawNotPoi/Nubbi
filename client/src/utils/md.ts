export function unlockMd(text: string) {
  // 正则表达式匹配 key=value 形式的行
  const meta: { [key: string]: string } = {};

  // 移除可能存在的空行
  const lines = text.trim().split("\n");
  let contentStart = 0;

  // 检查是否以一级标题开始
  if (lines[0].startsWith("# ")) {
    meta.title = lines[0].slice(2).trim();
    contentStart = 1;
  }

  // 查找meta属性部分
  let i = contentStart + 1;
  while (i < lines.length) {
    const line = lines[i].trim();
    console.log(line);

    // 遇到空行或非 key: value 格式就结束meta部分
    if (!line || !line.includes(":")) {
      break;
    }

    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      meta[key.toLowerCase()] = value;
    }
    i++;
  }

  // 剩余部分为内容
  const content = lines.slice(i).join("\n").trim();
  return { meta, content };
}
