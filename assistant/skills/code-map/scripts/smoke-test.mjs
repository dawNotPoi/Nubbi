/**
 * 冒烟测试：用 jsdom 加载生成的 HTML，模拟点击下钻，验证渲染链路无 JS 错误。
 * 运行：node scripts/smoke-test.mjs
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from './lib/analyze.mjs';
import { renderHtml } from './lib/render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const errors = [];
const vc = new VirtualConsole();
vc.on('error', (msg) => errors.push('console.error: ' + msg));
vc.on('jsdomError', (e) => {
  const msg = String(e.message || e);
  if (/Not implemented/.test(msg)) return; // 过滤 jsdom 未实现的浏览器 API 噪音
  errors.push('jsdomError: ' + msg);
});

/** 派发点击事件。 */
function click(dom, el) {
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = path.resolve(__dirname, '../../../api');
  console.log('分析目标:', target);
  const graph = analyze(target);
  const html = renderHtml(graph);

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;
  await sleep(120); // 等待 DOMContentLoaded → init()

  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => doc.querySelectorAll(s);

  // 1. 初始根目录视图
  let cards = $$('.card');
  console.log('初始卡片数:', cards.length);
  if (cards.length === 0) {
    console.error('❌ 初始视图没有卡片');
    process.exit(1);
  }

  // 2. 面包屑
  console.log('面包屑:', $('#crumb').textContent.replace(/\s+/g, ' ').trim());

  // 3. 点击目录卡片下钻
  const dirCard = [...cards].find((c) => c.className.includes('card-dir'));
  if (!dirCard) {
    console.error('❌ 没有目录卡片');
    process.exit(1);
  }
  const dirName = dirCard.querySelector('.card-title').textContent;
  click(dom, dirCard);
  await sleep(60);
  cards = $$('.card');
  console.log(`点击目录「${dirName}」后卡片数:`, cards.length);

  // 4. 点击文件卡片进入函数视图（自动找一个有函数的文件）
  const fileCards = [...cards].filter((c) => c.className.includes('card-file'));
  let fnCards = [];
  let clickedFile = null;
  for (const fc of fileCards.slice(0, 6)) {
    const fname = fc.querySelector('.card-title').textContent;
    click(dom, fc);
    await sleep(60);
    fnCards = [...$$('.card')].filter((c) => c.className.includes('card-fn'));
    if (fnCards.length > 0) {
      clickedFile = fname;
      break;
    }
  }
  if (clickedFile) {
    console.log(`点击文件「${clickedFile}」后函数卡片数:`, fnCards.length);

    // 5. 点击本地函数卡片打开详情面板
    const fnCard = fnCards.find((c) => !c.querySelector('.card-tag'));
    if (fnCard) {
      click(dom, fnCard);
      await sleep(60);
      const panel = $('#detail');
      console.log('函数详情面板打开:', panel.classList.contains('open'),
        '| 标题:', panel.querySelector('.dt-title')?.textContent);
      const closeBtn = panel.querySelector('.dt-close');
      if (closeBtn) {
        click(dom, closeBtn);
        await sleep(30);
        console.log('关闭后面板 open:', panel.classList.contains('open'));
      }
    }
  } else {
    console.log('（当前视图内没有含函数的文件卡片）');
  }

  // 6. 左侧树
  console.log('左侧树节点数:', $$('#tree [data-nav-id]').length);

  // 7. 搜索
  const search = $('#search');
  search.value = 'Controller';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(40);
  const results = $$('#search-results .sr-item');
  console.log('搜索「Controller」结果数:', results.length);
  if (results.length > 0) {
    const first = [...results].find((r) => !r.classList.contains('muted'));
    if (first) {
      click(dom, first);
      await sleep(60);
      console.log('点击搜索结果后卡片数:', $$('.card').length);
    }
  }

  if (errors.length) {
    console.error('❌ 发现 JS 错误:');
    errors.forEach((e) => console.error('  ', e));
    dom.window.close();
    process.exit(1);
  }
  console.log('✅ 冒烟测试通过，无 JS 错误');
  dom.window.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
