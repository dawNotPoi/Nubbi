/**
 * 渲染器：读取 client.js 与图数据，拼装自包含 HTML。
 * 产物无外部依赖，双击即可在浏览器中打开。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background: #f8fafc; color: #0f172a; }
#topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 14px; background: #0f172a; color: #e2e8f0; padding: 0 16px; height: 48px; }
.brand { font-weight: 700; white-space: nowrap; font-size: 14px; }
.brand .target { color: #38bdf8; }
#crumb-wrap { flex: 1; min-width: 0; }
#crumb { display: flex; align-items: center; gap: 2px; overflow: hidden; white-space: nowrap; font-size: 13px; }
.crumb-item { color: #94a3b8; padding: 2px 6px; border-radius: 4px; }
.crumb-item:hover { color: #fff; background: rgba(255,255,255,.08); }
.crumb-item.cur { color: #fff; font-weight: 600; }
.crumb-sep { color: #475569; }
.search-wrap { position: relative; width: 260px; }
#search { width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font-size: 13px; outline: none; }
#search:focus { border-color: #38bdf8; }
#search-results { position: absolute; top: 36px; right: 0; width: 360px; max-height: 400px; overflow: auto; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.15); display: none; z-index: 50; }
#search-results.show { display: block; }
.sr-item { padding: 8px 10px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
.sr-item:hover { background: #f1f5f9; }
.sr-item.muted { color: #94a3b8; cursor: default; }
.tree-count { color: #94a3b8; font-size: 11px; font-weight: normal; }
.body { display: flex; height: calc(100vh - 48px - 28px); }
#sidebar { width: 260px; min-width: 260px; overflow: auto; background: #fff; border-right: 1px solid #e2e8f0; padding: 10px; }
.side-title { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: .05em; margin-bottom: 8px; }
#main { flex: 1; overflow: auto; position: relative; background: #f8fafc; }
#legend { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: 14px; padding: 6px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569; }
.lg { display: inline-flex; align-items: center; gap: 4px; }
.lg i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
#canvas { position: relative; margin: 20px; }
#canvas svg.edge-layer { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 0; }
.card { position: absolute; box-sizing: border-box; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 2px rgba(15,23,42,.06); padding: 10px 12px; cursor: pointer; transition: box-shadow .15s, transform .15s; z-index: 1; }
.card:hover { box-shadow: 0 4px 12px rgba(15,23,42,.14); transform: translateY(-1px); }
.card-dir { border-left: 4px solid #2563eb; }
.card-file { border-left: 4px solid #059669; }
.card-fn { border-left: 4px solid #7c3aed; }
.card-ico { width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 8px; vertical-align: middle; float: left; }
.card-ico.dir { background: #eff6ff; color: #2563eb; }
.card-ico.file { background: #ecfdf5; color: #059669; }
.card-ico.fn { color: #fff; font-weight: 700; }
.card-ico.ext { background: #fffbeb; color: #f59e0b; }
.card-title { font-size: 13px; font-weight: 600; color: #0f172a; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 28px; }
.card-sub { font-size: 11px; color: #64748b; margin-top: 6px; clear: both; }
.card-params { font-size: 10px; color: #94a3b8; margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; max-height: 28px; overflow: hidden; word-break: break-all; }
.card-tag { position: absolute; top: 6px; right: 8px; font-size: 10px; color: #b45309; background: #fffbeb; border: 1px dashed #fcd34d; border-radius: 4px; padding: 0 4px; }
.highlight { outline: 3px solid #f59e0b; outline-offset: 2px; }
.edge-label { font-size: 10px; fill: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; paint-order: stroke; stroke: #f8fafc; stroke-width: 4px; }
.empty { padding: 60px; text-align: center; color: #94a3b8; font-size: 14px; }
.canvas-tip { position: absolute; left: 0; bottom: -22px; font-size: 11px; color: #b45309; }
.tree-dir { font-size: 12px; margin: 1px 0; }
.tree-dir summary { cursor: pointer; padding: 3px 6px; border-radius: 4px; color: #334155; list-style-position: inside; }
.tree-dir summary:hover { background: #f1f5f9; }
.tree-file { cursor: pointer; padding: 3px 6px 3px 24px; border-radius: 4px; color: #475569; font-size: 12px; }
.tree-file:hover { background: #f1f5f9; }
[data-nav-id].active { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
#detail { position: fixed; top: 48px; right: 0; bottom: 28px; width: 380px; background: #fff; border-left: 1px solid #e2e8f0; box-shadow: -4px 0 16px rgba(0,0,0,.08); z-index: 40; overflow: auto; transform: translateX(100%); transition: transform .2s; }
#detail.open { transform: translateX(0); }
.detail-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: #fff; z-index: 2; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.dt-title { font-weight: 700; font-size: 14px; }
.dt-kind { font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; }
.dt-close { margin-left: auto; border: none; background: none; cursor: pointer; font-size: 14px; color: #94a3b8; }
.dt-file { padding: 8px 14px; font-size: 12px; color: #2563eb; cursor: pointer; word-break: break-all; border-bottom: 1px solid #f1f5f9; }
.dt-section { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
.dt-h { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.dt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dt-table td { padding: 3px 4px; border-bottom: 1px solid #f8fafc; vertical-align: top; }
.td-name { color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
.td-type { color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
.dt-row { font-size: 12px; color: #475569; margin-top: 6px; }
.dt-label { color: #94a3b8; margin-right: 4px; }
code { background: #f1f5f9; border-radius: 4px; padding: 1px 4px; font-size: 11px; color: #334155; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.dt-call { font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f8fafc; }
.dt-callee { color: #2563eb; cursor: pointer; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.dt-args { color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; margin-left: 4px; word-break: break-all; }
.dt-src { font-size: 11px; color: #94a3b8; margin-top: 2px; word-break: break-all; }
.dt-muted { font-size: 12px; color: #94a3b8; }
#stats { position: fixed; bottom: 0; left: 0; right: 0; height: 28px; background: #0f172a; color: #94a3b8; font-size: 11px; display: flex; align-items: center; padding: 0 16px; z-index: 30; overflow: hidden; white-space: nowrap; }
`;

/**
 * 生成自包含 HTML。
 * @param {object} graph 由 analyze 产出的图数据。
 * @returns {string} HTML 字符串。
 */
export function renderHtml(graph) {
  const clientJs = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf8');
  // 把 JSON 中的 < 转义成 \u003c，防止源码字符串里的 </script> 破坏 HTML 结构
  const json = JSON.stringify(graph).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>代码结构图 · ${escapeHtml(graph.targetName)}</title>
<style>${CSS}</style>
</head>
<body>
<header id="topbar">
  <div class="brand">&#128506; 代码结构图 <span class="target" id="target-name"></span></div>
  <div id="crumb-wrap"><div id="crumb"></div></div>
  <div class="search-wrap">
    <input id="search" placeholder="搜索文件 / 函数…" autocomplete="off" spellcheck="false">
    <div id="search-results"></div>
  </div>
</header>
<div class="body">
  <aside id="sidebar">
    <div class="side-title">目录结构</div>
    <div id="tree"></div>
  </aside>
  <main id="main">
    <div id="legend"></div>
    <div id="canvas"></div>
  </main>
</div>
<div id="detail"></div>
<footer id="stats"></footer>
<script>
window.GRAPH = ${json};
${clientJs}
<\/script>
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
