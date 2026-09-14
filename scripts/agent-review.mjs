#!/usr/bin/env node

/**
 * Agent Review 命令
 *
 * 用法：
 *   pnpm agent review              # Review 最近一次提交
 *   pnpm agent review <hash>       # Review 指定提交
 *   pnpm agent review --today      # Review 今天所有提交
 *   pnpm agent review --range HEAD~3..HEAD  # Review 最近3次提交
 *
 * 流程：
 *   1. 收集 commit 信息（hash, message, author, files, diff）
 *   2. 输出信息供 Agent 执行 code-review skill
 *   3. 用户确认后，Agent 将结果存入 docs/changes/
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CHANGES_DIR = join(PROJECT_ROOT, 'docs', 'changes');

// 确保 changes 目录存在
if (!existsSync(CHANGES_DIR)) {
  mkdirSync(CHANGES_DIR, { recursive: true });
}

function exec(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
  } catch (e) {
    return '';
  }
}

function getCommitRange(args) {
  if (args.includes('--today')) {
    return '--since="00:00:00"';
  }
  if (args.includes('--range')) {
    const idx = args.indexOf('--range');
    return args[idx + 1] || 'HEAD~1..HEAD';
  }
  // 指定了 hash
  const hash = args.find(a => /^[a-f0-9]{7,40}$/.test(a));
  if (hash) {
    return `${hash}~1..${hash}`;
  }
  // 默认最近一次
  return 'HEAD~1..HEAD';
}

function getCommits(range) {
  const format = '--format="%H||%an||%ai||%s"';
  const cmd = `git log ${range} ${format} --no-merges`;
  const output = exec(cmd);

  if (!output) {
    console.log('没有找到提交记录');
    return [];
  }

  return output.split('\n').map(line => {
    // 去除引号
    line = line.replace(/^"|"$/g, '');
    const [hash, author, date, ...msgParts] = line.split('||');
    return {
      hash: hash?.substring(0, 8),
      fullHash: hash,
      author,
      date,
      message: msgParts.join('||'),
    };
  });
}

function getChangedFiles(range) {
  return exec(`git diff --name-only ${range}`).split('\n').filter(Boolean);
}

function getDiff(range) {
  return exec(`git diff ${range}`);
}

function getDiffStat(range) {
  return exec(`git diff --stat ${range}`);
}

// ====== 主流程 ======

const args = process.argv.slice(2);
const range = getCommitRange(args);
const commits = getCommits(range);
const files = getChangedFiles(range);
const diff = getDiff(range);
const diffStat = getDiffStat(range);

console.log('═══════════════════════════════════════════');
console.log('        Agent Code Review');
console.log('═══════════════════════════════════════════');
console.log();

console.log(`📋 审查范围: ${range}`);
console.log(`📝 提交数: ${commits.length}`);
console.log(`📁 变更文件: ${files.length}`);
console.log();

console.log('── 提交信息 ──');
commits.forEach(c => {
  console.log(`  ${c.hash} | ${c.author} | ${c.date}`);
  console.log(`  ${c.message}`);
  console.log();
});

console.log('── 变更统计 ──');
console.log(diffStat || '(无变更)');
console.log();

console.log('── 变更文件列表 ──');
files.forEach(f => console.log(`  - ${f}`));
console.log();

// 输出触发 Agent 的信息
console.log('═══════════════════════════════════════════');
console.log('📋 Agent Review 任务已准备就绪');
console.log();
console.log('请 Agent 执行以下操作：');
console.log('1. 调用 code-review skill 审查以上变更');
console.log('2. 调用 change-log skill 将结果存入 docs/changes/');
console.log('3. 如有需要，调用 doc-generate skill 更新文档');
console.log('═══════════════════════════════════════════');

// 输出结构化数据供 Agent 读取
const reviewInput = {
  range,
  commits,
  files,
  diff,
  timestamp: new Date().toISOString(),
};

const inputFile = join(PROJECT_ROOT, '.agent', '.last-review-input.json');
writeFileSync(inputFile, JSON.stringify(reviewInput, null, 2));
console.log();
console.log(`💾 审查输入已保存至: .agent/.last-review-input.json`);
