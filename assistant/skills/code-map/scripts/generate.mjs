#!/usr/bin/env node
/**
 * 命令行入口：node scripts/generate.mjs <目标目录> [--out <html>] [--no-open]
 */
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze } from './lib/analyze.mjs';
import { renderHtml } from './lib/render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 解析命令行参数。 */
function parseArgs(argv) {
  const args = { target: null, out: null, open: true };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--no-open') args.open = false;
    else if (a === '--limit') {
      i++; // 预留：超大目录时的节点数上限，当前不启用
    } else if (a.startsWith('--')) {
      /* 忽略未知选项 */
    } else rest.push(a);
  }
  args.target = rest[0] ?? null;
  return args;
}

/** 尝试用默认浏览器打开 HTML，失败时静默。 */
function openInBrowser(filePath) {
  const cmd = process.platform === 'win32'
    ? `start "" "${filePath}"`
    : process.platform === 'darwin'
      ? `open "${filePath}"`
      : `xdg-open "${filePath}"`;
  exec(cmd, (err) => {
    if (err) console.log('（未能自动打开浏览器，可手动用浏览器打开上面的路径）');
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error('用法: node scripts/generate.mjs <目标目录> [--out <html>] [--no-open]');
    console.error('示例: node scripts/generate.mjs ../../assistant');
    process.exit(1);
  }
  const target = path.resolve(args.target);
  if (!fs.existsSync(target)) {
    console.error(`目标目录不存在: ${target}`);
    process.exit(1);
  }

  console.log(`正在分析: ${target}`);
  const graph = analyze(target);
  const html = renderHtml(graph);

  const out = args.out
    ? path.resolve(args.out)
    : path.join(target, '.tmp', 'code-map', 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');

  console.log(`✔ 已生成: ${out}`);
  console.log(
    `  目录 ${graph.stats.dirCount} · 文件 ${graph.stats.fileCount} · `
    + `函数 ${graph.stats.functionCount} · 调用 ${graph.stats.callCount} 条`
    + ` · 耗时 ${graph.stats.elapsedMs}ms`,
  );
  if (graph.diagnostics.aliases.length) {
    console.log(`  已识别路径别名: ${graph.diagnostics.aliases.join(', ')}`);
  }
  if (!graph.diagnostics.hasTsconfig) {
    console.log('  提示: 目标目录下没有 tsconfig.json，路径别名可能未解析');
  }

  if (args.open) openInBrowser(out);
}

main();
